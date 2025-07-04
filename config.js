export const symbols = [
  {id: 'BTCUSDT', tick: 500},
  {id: 'ETHUSDT', tick: 25},
  {id: 'BNBUSDT', tick: 10},
  {id: 'SOLUSDT', tick: 2},
]

export const keepDays = 7;
export const time = new Date().toJSON().substring(0, 14) + '00:00';
export const minTime = new Date(Date.now() - keepDays * 864e5).toJSON().substring(0, 14) + '00:00';