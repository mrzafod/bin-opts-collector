import { symbols } from './config.js';
import { appendDataFile, fetchBApi, flatRollup } from './utils.js';

const getRollup = async (symbol) => {
  const url = 'composite/v1/public/bigdata/option/openInterestByStrike';
  const dataArr = await fetchBApi(url, { underlying: symbol });

  const prePollArr = (dataArr || []).map((d) => {
    return {
      price: +d.strike,
      side: d.type == 'C' ? 'CALL' : 'PUT',
      interest: +d.sumOpenInterest,
      volume: +d.sumVolume,
    };
  });

  return flatRollup(
    prePollArr,
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
      price,
      pv: put.volume,
      pi: put.interest,
      cv: call.volume,
      ci: call.interest,
    };
  });
};

const appendFile = async (symbol, rollupArr = []) => {
  const filePath = `data/options/${symbol}.json`;
  await appendDataFile(filePath, rollupArr);
};

const handleSymbol = async (selectedContract) => {
  const rollup = await getRollup(selectedContract);
  await appendFile(selectedContract, rollup);
};

export const collectOptions = async () => {
  await Promise.all(symbols.map((symbol) => handleSymbol(symbol.id)));
};
