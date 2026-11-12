import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {Rating} from '../src/Rating';
it('exposes eleven labeled positions with exact backend values and no optimistic selection',()=>{
 const change=vi.fn();const {rerender}=render(<Rating value={90} disabled={false} onChange={change}/>);
 const choices=screen.getAllByRole('radio');expect(choices.map(e=>e.textContent)).toEqual(['0','½','1','½','2','½','3','½','4','½','5']);
 choices.forEach((button,i)=>{fireEvent.click(button);expect(change).toHaveBeenLastCalledWith(i*10);expect(screen.getByRole('radio',{name:'4.5 stars'})).toHaveAttribute('aria-checked','true');});
 rerender(<Rating value={0} disabled={false} onChange={change}/>);expect(choices[0]).toHaveAttribute('aria-checked','true');expect(choices[0]).toHaveAttribute('tabindex','0');
 rerender(<Rating value={0} disabled onChange={change}/>);change.mockClear();choices.forEach(button=>{expect(button).toBeDisabled();fireEvent.click(button);});expect(change).not.toHaveBeenCalled();
});
it('supports arrows and Home/End across the entire scale',()=>{
 const change=vi.fn();render(<Rating value={0} disabled={false} onChange={change}/>);const choices=screen.getAllByRole('radio');choices[0].focus();
 fireEvent.keyDown(choices[0],{key:'ArrowRight'});expect(change).toHaveBeenLastCalledWith(10);expect(choices[1]).toHaveFocus();
 fireEvent.keyDown(choices[1],{key:'End'});expect(change).toHaveBeenLastCalledWith(100);expect(choices[10]).toHaveFocus();
 fireEvent.keyDown(choices[10],{key:'Home'});expect(change).toHaveBeenLastCalledWith(0);expect(choices[0]).toHaveFocus();
});
