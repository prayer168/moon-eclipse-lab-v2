import type {V} from './model';
export const geography=[
 {name:'臺灣',lat:23.7,lon:121,kind:'place'},
 {name:'亞洲',lat:40,lon:90,kind:'continent'},{name:'歐洲',lat:52,lon:18,kind:'continent'},
 {name:'非洲',lat:3,lon:22,kind:'continent'},{name:'北美洲',lat:45,lon:-105,kind:'continent'},
 {name:'南美洲',lat:-15,lon:-60,kind:'continent'},{name:'大洋洲',lat:-25,lon:135,kind:'continent'},
 {name:'南極洲',lat:-80,lon:30,kind:'continent'},
 {name:'太平洋',lat:5,lon:-150,kind:'ocean'},{name:'大西洋',lat:10,lon:-35,kind:'ocean'},
 {name:'印度洋',lat:-22,lon:75,kind:'ocean'},{name:'北冰洋',lat:80,lon:-30,kind:'ocean'},
 {name:'南冰洋',lat:-64,lon:80,kind:'ocean'},
] as const;
/** Body-fixed +X Greenwich, +Y 90 east, +Z north. */
export function geographicNormal(lat:number,lon:number):V {const a=lat*Math.PI/180,b=lon*Math.PI/180;return [Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a)];}
export function geographicUV(lat:number,lon:number){return [(lon+180)/360,(lat+90)/180];}
