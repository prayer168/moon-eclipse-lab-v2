/** Cancel a stationary hold on any drag or second pointer, including pinch gestures. */
export class HoldToExit {
 private pointers=new Set<number>();private origin:[number,number]=[0,0];private timer:ReturnType<typeof setTimeout>|undefined;
 constructor(private exit:()=>void,private delay=900){}
 down(id:number,x:number,y:number){this.pointers.add(id);this.clearTimer();if(this.pointers.size!==1)return;this.origin=[x,y];this.timer=setTimeout(()=>{this.timer=undefined;this.exit();},this.delay);}
 move(x:number,y:number){if(Math.hypot(x-this.origin[0],y-this.origin[1])>8)this.clearTimer();}
 up(id:number){this.pointers.delete(id);this.clearTimer();}
 cancel(){this.pointers.clear();this.clearTimer();}
 private clearTimer(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
}
