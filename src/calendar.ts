import months from './data/hko-months.json';
import {DAY_MS,J2000_MS,dateFromDays,daysFromMs} from './ephemeris';
export const MIN_MS=Date.parse('1901-01-01T00:00:00+08:00'),MAX_MS=Date.parse('2100-12-31T23:59:59.999+08:00');
const pad=(v:number)=>String(v).padStart(2,'0');
export function civilParts(ms:number){const d=new Date(ms+8*3600000);return {date:`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`,time:`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,seconds:pad(d.getUTCSeconds())};}
export function parseCivil(date:string,time='20:00'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return null;
 const ms=Date.parse(`${date}T${time}:00+08:00`);
 if(!Number.isFinite(ms)||ms<MIN_MS||ms>MAX_MS)return null;
 const p=civilParts(ms);return p.date===date&&p.time===time?ms:null;
}
export const shiftDay=(ms:number,days:number)=>{const target=ms+days*DAY_MS;return target<MIN_MS||target>MAX_MS?ms:target;};
export const inDateRange=(t:number)=>{const ms=J2000_MS+t*DAY_MS;return ms>=MIN_MS&&ms<=MAX_MS;};
const monthNames=['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
const days=['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
export function calendarLabels(t:number){
 const date=dateFromDays(t),p=civilParts(date.getTime()),serial=Math.floor((date.getTime()+8*3600000)/DAY_MS);
 let lo=0,hi=months.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(months[mid][0]<=serial)lo=mid+1;else hi=mid;}
 if(lo===0||date.getTime()<MIN_MS||date.getTime()>MAX_MS)throw new RangeError('日期須在1901–2100年');
 const [start,year,monthNumber,leap]=months[lo-1],month=(leap?'閏':'')+monthNames[monthNumber-1],day=days[serial-start],name=stems[((year-4)%10+10)%10]+branches[((year-4)%12+12)%12];

 return {lunar:`農曆 ${year}（${name}）年${month}${day}`,gregorian:`西元 ${p.date.replace('-','年').replace('-','月')}日`,clock:`臺灣時間 ${p.time}:${p.seconds}（UTC+08:00）`,monthDay:month+day,yearName:name,date:p.date,time:p.time};
}
export {DAY_MS,J2000_MS,dateFromDays,daysFromMs};
