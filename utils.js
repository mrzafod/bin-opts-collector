import { readFileSync, writeFileSync } from 'fs';
import { minTime, time } from './config.js';

export const fetchBApi = async (pathname = '', params = {}) => {
  const base = 'https://www.binance.com/bapi';
  const path = pathname.replace(/^\//, '');
  const search = new URLSearchParams(params).toString();
  const url = base + '/' + path + '?' + search;
  const res = await fetch(url);
  const data = await res.json();
  return data.data;
};

export const appendDataFile = async (filePath, appendData = []) => {
  let fileData = [];
  try {
    const raw = readFileSync(filePath, 'utf8');
    fileData = JSON.parse(raw);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const jsonArray =
    '[\n' +
    appendData
      .map((d) => Object.assign({ time }, d))
      .concat(filterDataByTime(fileData))
      .map((item) => '  ' + JSON.stringify(item))
      .join(',\n') +
    '\n]';

  writeFileSync(filePath, jsonArray);
};

export const filterDataByTime = (data = []) => {
  return data.filter((d) => d.time < time && d.time >= minTime);
};

export const flatRollup = (data, reduceFn, ...keyFns) => {
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
