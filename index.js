import { readFileSync, writeFileSync } from 'fs';

const callData = async (pathname = '', params = {}) => {
  const base = 'https://www.binance.com/bapi';
  const path = pathname.replace(/^\//, '');
  const search = new URLSearchParams(params).toString();
  const url = base + '/' + path + '?' + search;
  const res = await fetch(url);
  const data = await res.json();
  return data.data;
};

const time = new Date().toJSON().substring(0, 14) + '00:00';

const optionsContractArray = [
  {
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    underlying: 'SOLUSDT',
    settleAsset: 'USDT',
  },
  {
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    underlying: 'BTCUSDT',
    settleAsset: 'USDT',
  },
  {
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    underlying: 'ETHUSDT',
    settleAsset: 'USDT',
  },
  {
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    underlying: 'BNBUSDT',
    settleAsset: 'USDT',
  },
];

const flatRollup = (data, reduceFn, ...keyFns) => {
  const group = (data, depth = 0) => {
    if (depth >= keyFns.length) return reduceFn(data);

    const map = new Map();
    for (const item of data) {
      const key = keyFns[depth](item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }

    const result = [];
    for (const [key, groupItems] of map) {
      const nested = group(groupItems, depth + 1);
      if (Array.isArray(nested[0])) {
        for (const row of nested) {
          result.push([key, ...row]);
        }
      } else {
        result.push([key, nested]);
      }
    }

    return result;
  };

  return group(data);
};

const getContractOIDataRollup = async (selectedContract) => {
  const optionSymbolOpenInterestStrikeDataArray = await callData(
    'composite/v1/public/bigdata/option/openInterestByStrike',
    {
      underlying: selectedContract.underlying,
    }
  );

  const optionSymbolInterestPreRollup = (
    optionSymbolOpenInterestStrikeDataArray || []
  ).map((d) => {
    return {
      price: +d.strike,
      side: d.type == 'C' ? 'CALL' : 'PUT',
      interest: +d.sumOpenInterest,
      volume: +d.sumVolume,
    };
  });

  return flatRollup(
    optionSymbolInterestPreRollup,
    (arr) => {
      const res = {};
      arr.forEach((d) => {
        res.price = d.price;
        res[d.side == 'CALL' ? 'call' : 'put'] = d;
      });
      return res;
    },
    (d) => d.price
  ).map((d) => {
    const { price, put, call } = d[1];
    return {
      time,
      price,
      putVol: put.volume,
      putInt: put.interest,
      callVol: call.volume,
      callInt: call.interest,
    };
  });
};

const appendContractDataFile = async (
  selectedContract,
  optionSymbolInterestRollup
) => {
  const fileName = `data/${selectedContract.underlying}.json`;

  let data = [];
  try {
    const raw = readFileSync(fileName, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const jsonArray =
    '[\n' +
    optionSymbolInterestRollup
      .concat(data.filter((d) => d.time < time))
      .map((item) => '  ' + JSON.stringify(item))
      .join(',\n') +
    '\n]';

  writeFileSync(fileName, jsonArray);
};

const handleContract = async (selectedContract, refreshStats) => {
  const rollup = await getContractOIDataRollup(selectedContract);
  await appendContractDataFile(selectedContract, rollup);
};

const execute = async () => {
  await Promise.all(
    optionsContractArray.map((selectedContract) =>
      handleContract(selectedContract, 0)
    )
  );
};

execute();
