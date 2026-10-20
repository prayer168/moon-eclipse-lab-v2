import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {HoldToExit} from '../src/hold-to-exit';
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
it('靜止長按0.9秒觸發一次，短按不觸發',()=>{const f=vi.fn(),g=new HoldToExit(f);g.down(1,20,20);vi.advanceTimersByTime(899);expect(f).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(f).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(900);expect(f).toHaveBeenCalledTimes(1);g.up(1);g.down(1,0,0);vi.advanceTimersByTime(100);g.up(1);vi.advanceTimersByTime(1000);expect(f).toHaveBeenCalledTimes(1);});
it('旋轉拖曳取消返回，細微手震仍可長按',()=>{const f=vi.fn(),g=new HoldToExit(f);g.down(1,0,0);g.move(10,0);vi.advanceTimersByTime(1000);expect(f).not.toHaveBeenCalled();g.up(1);g.down(1,0,0);g.move(3,4);vi.advanceTimersByTime(900);expect(f).toHaveBeenCalledTimes(1);});
it('雙指縮放與取消手勢不會意外離開',()=>{const f=vi.fn(),g=new HoldToExit(f);g.down(1,0,0);g.down(2,10,0);vi.advanceTimersByTime(1000);g.up(2);vi.advanceTimersByTime(1000);expect(f).not.toHaveBeenCalled();g.up(1);g.down(3,0,0);g.cancel();vi.advanceTimersByTime(1000);expect(f).not.toHaveBeenCalled();});
