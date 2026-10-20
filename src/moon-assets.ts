import type {Raster} from './moon-surface';
export const moonAssets:{color?:HTMLImageElement;normal?:HTMLImageElement;colorPixels?:Raster;normalPixels?:Raster;error?:string;ready:boolean}={ready:false};
let pending:Promise<void>|undefined;
function image(path:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('月面資料載入失敗，請重新整理或確認網路。'));im.src=new URL('maps/'+path,document.baseURI).href;});}
function pixels(im:HTMLImageElement):Raster{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(im,0,0);return {width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};}
export function loadMoonAssets(){return pending??=Promise.all([image('moon-albedo.jpg'),image('moon-normal.png')]).then(([color,normal])=>{Object.assign(moonAssets,{color,normal,ready:true});window.dispatchEvent(new Event('moonassetsready'));}).catch(e=>{moonAssets.error=String(e);window.dispatchEvent(new Event('moonassetsready'));});}

export function ensureMoonPixels(){if(!moonAssets.colorPixels&&moonAssets.color&&moonAssets.normal){moonAssets.colorPixels=pixels(moonAssets.color);moonAssets.normalPixels=pixels(moonAssets.normal);}}
