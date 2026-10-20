import {describe,it,expect} from 'vitest';
import {parseCivil,civilParts,calendarLabels,daysFromMs,dateFromDays,shiftDay,MIN_MS,MAX_MS} from '../src/calendar';
import fixtures from './fixtures/hko-lunar.json';
describe('臺灣標準時間與HKO農曆',()=>{
 it('14個官方農曆案例：閏月、春節、1901/2100邊界、2033及2057午夜新月',()=>{for(const f of fixtures.cases){const ms=parseCivil(f.date)!;const q=calendarLabels(daysFromMs(ms));expect(q.monthDay,f.date).toBe(f.expectedMonthDay);expect(q.lunar).toContain(String(f.expectedYear));if(f.LunarYear)expect(q.lunar).toContain(f.LunarYear.split('年')[0]);}});
 it('日期預設20:00、跨UTC日及臺灣午夜邊界',()=>{const ms=parseCivil('2024-02-10')!;expect(dateFromDays(daysFromMs(ms)).toISOString()).toBe('2024-02-10T12:00:00.000Z');expect(civilParts(Date.parse('2024-02-09T15:59:59Z')).date).toBe('2024-02-09');expect(calendarLabels(daysFromMs(Date.parse('2024-02-09T16:00:00Z'))).monthDay).toBe('正月初一');});
 it('拒絕無效、非閏年、超出範圍；保留時分跨閏日與跨年',()=>{for(const d of ['2023-02-29','2024-02-30','1900-12-31','2101-01-01','2024-13-01'])expect(parseCivil(d)).toBeNull();expect(parseCivil('2024-02-29','25:00')).toBeNull();const ms=parseCivil('2024-02-28','23:45')!;expect(civilParts(shiftDay(ms,1))).toMatchObject({date:'2024-02-29',time:'23:45'});expect(civilParts(shiftDay(parseCivil('2024-12-31','20:10')!,1))).toMatchObject({date:'2025-01-01',time:'20:10'});expect(shiftDay(MIN_MS,-1)).toBe(MIN_MS);expect(shiftDay(MAX_MS,1)).toBe(MAX_MS);});
});
