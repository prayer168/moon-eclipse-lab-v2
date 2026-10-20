"""Build offline month starts from the 200 official HKO annual text tables.
Download the links listed on https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm
into .cache/hko/ before running. Only factual calendar data is retained.
"""
from pathlib import Path
from datetime import date,timedelta
import re,json,hashlib,unicodedata,bisect
ROOT=Path(__file__).resolve().parent.parent
base=date(1970,1,1)
names=['正','二','三','四','五','六','七','八','九','十','十一','十二']
days=['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']
months=[];rows=[];hashes=[];lyear=1900;month=11;leap=0
for year in range(1901,2101):
 path=ROOT/'.cache/hko'/f'T{year}c.txt';raw=path.read_bytes();text=unicodedata.normalize('NFKC',raw.decode('utf-8-sig'))
 hashes.append({'year':year,'sha256':hashlib.sha256(raw).hexdigest()})
 found=0
 for m in re.finditer(r'^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\S+)\s+星期',text,re.M):
  y,mo,d=map(int,m.group(1,2,3));civil=date(y,mo,d);token=m[4]
  if token.endswith('月'):
   leap=int(token.startswith('閏'));name=token.removeprefix('閏').removesuffix('月');month=1 if name=='一' else names.index(name)+1
   if month==1 and not leap:lyear=year
   day=1;months.append([(civil-base).days,lyear,month,leap])
  else:day=days.index(token)+1
  if not rows:months.append([((civil-timedelta(days=day-1))-base).days,lyear,month,leap])
  if rows:assert civil==rows[-1][0]+timedelta(days=1),(civil,'missing date')
  rows.append((civil,lyear,month,leap,day));found+=1
 assert found==(date(year+1,1,1)-date(year,1,1)).days,(year,found)
months.sort();starts=[x[0] for x in months]
for civil,y,m,l,d in rows:
 start,yy,mm,ll=months[bisect.bisect_right(starts,(civil-base).days)-1]
 assert [y,m,l,d]==[yy,mm,ll,(civil-base).days-start+1],civil
for a,b in zip(months,months[1:]):assert b[0]-a[0] in [29,30],(a,b)
(ROOT/'src/data').mkdir(exist_ok=True)
(ROOT/'src/data/hko-months.json').write_text(json.dumps(months,separators=(',',':')),encoding='utf-8')
report={'source':'https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm','retrieved':'2026-10-20','rowsVerified':len(rows),'monthStarts':len(months),'first':str(rows[0][0]),'last':str(rows[-1][0]),'contiguous':True,'monthLengths':'29 or 30 days','sourceHashes':hashes}
(ROOT/'docs/hko-calendar-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
fixtures=json.loads((ROOT/'tests/fixtures/hko-lunar.json').read_text(encoding='utf-8-sig'))
for f in fixtures['cases']:
 row=next(x for x in rows if str(x[0])==f['date']);_,y,mo,l,d=row
 f['expectedYear']=y;f['expectedMonthDay']=('閏' if l else '')+names[mo-1]+'月'+days[d-1]
 if f['LunarDate'] is None:f['source']=f'https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T{row[0].year}c.txt';f['LunarDate']=f['expectedMonthDay']
(ROOT/'tests/fixtures/hko-lunar.json').write_text(json.dumps(fixtures,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='sourceHashes'}))
