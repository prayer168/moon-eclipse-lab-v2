import type {V} from './model';
export const SOLAR_ROTATION_DAYS=25;
export function sunspotGroups(tDays:number){
 const turn=((tDays/SOLAR_ROTATION_DAYS)%1+1)%1*Math.PI*2;
 return Array.from({length:6},(_,j)=>{const group=Math.floor(j/2),phase=(((tDays+group*20)/60)%1+1)%1,life=Math.sin(Math.PI*phase)**2,lon=group*Math.PI*2/3+(j%2)*.075+turn,lat=(group%2?-.30:.25)+(j%2)*.025,radius=(j%2?.038:.055)*(.35+.65*Math.sqrt(life));return {direction:[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)] as V,strength:life,radius};});
}
