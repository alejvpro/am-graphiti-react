import {it,expect,vi} from 'vitest';
import {render,screen,waitFor,within,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {App} from '../src/App';
import {SampleService} from '../src/sample';
async function loaded(service=new SampleService()){render(<App service={service}/>);await screen.findByRole('radiogroup',{name:'Rating'});return service;}
it('renders primary controls with exact independent tokens and half-star rating',async()=>{
 const service=await loaded();expect(screen.getByText('4.5 / 5')).toBeInTheDocument();expect(screen.queryByRole('slider')).not.toBeInTheDocument();
 for(const name of ['Suzible','Genpop','Lari','Fam','PG13','R','NC17','re','Misogyny','LGBTphobic'])expect(screen.getByRole('checkbox',{name,exact:true})).toBeInTheDocument();
 for(const [label,token] of [['Sensual','[sensual]'],['Sexual','[sexual]'],['Vulgar','[vulgar]'],['Violence','[violence]'],['re','[re]'],['Misogyny','[misogyny]'],['LGBTphobic','[lgptphobic]']]){
  await userEvent.click(screen.getByRole('checkbox',{name:label,exact:true}));await waitFor(()=>expect(service.calls.some(r=>r.query.tag===token)).toBe(true));
 }
 await userEvent.click(screen.getByRole('radio',{name:'3.5 stars',exact:true}));expect(screen.getByText('3.5 / 5')).toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Clear rating'}));expect(screen.getByText('0 / 5')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Favorite'})).toHaveAttribute('aria-pressed','true');
 const mood=screen.getByRole('group',{name:'Mood'}),energy=screen.getByRole('group',{name:'Energy'});
 await userEvent.click(within(mood).getByRole('button',{name:'Unset'}));expect(within(mood).getByRole('button',{name:'Neutral'})).toHaveAttribute('aria-pressed','false');
 expect(within(energy).getByRole('button',{name:'Unset'})).toBeInTheDocument();
});
it('shares repeated flags, preserves unpro, and provides More groups',async()=>{
 await loaded();await userEvent.click(screen.getByRole('checkbox',{name:'gclean',exact:true}));await userEvent.click(screen.getByRole('button',{name:'Metadata'}));
 const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('checkbox',{name:'gclean',exact:true})).toBeChecked();expect(within(dialog).getByRole('radio',{name:'Legacy unpro · preserved'})).toBeChecked();
 expect(within(dialog).getByRole('radio',{name:'Processed'})).toBeDisabled();await userEvent.click(within(dialog).getByRole('checkbox',{name:'gclean',exact:true}));await userEvent.click(screen.getByRole('button',{name:'Close editor'}));expect(screen.getByRole('checkbox',{name:'gclean',exact:true})).not.toBeChecked();
 await userEvent.click(screen.getByRole('button',{name:'More song tags'}));for(const name of ['Language sung/spoken','Region','Sound','Vocals','Rap','Structure & performance','Time'])expect(screen.getByRole('group',{name})).toBeInTheDocument();expect(screen.getByRole('checkbox',{name:'vnstrumental'})).toBeInTheDocument();
});
it('unsupported editors and album drawer never submit writes',async()=>{
 const service=await loaded();
 for(const [entry,save] of [['Hip-Hop/Rap · R&B/Soul','Set genres'],['First heard · Apr 8, 2022','Set date'],['Album status','Set album status']]){
  await userEvent.click(screen.getByRole('button',{name:new RegExp(entry)}));expect(screen.getByRole('button',{name:new RegExp(save)})).toBeDisabled();await userEvent.click(screen.getByRole('button',{name:'Close editor'}));
 }
 await userEvent.click(screen.getByRole('button',{name:/RAMONA PARK/}));expect(screen.getByText('LEGO')).toBeInTheDocument();expect(screen.getByRole('checkbox',{name:'Suzy'})).toBeDisabled();expect(service.calls.filter(r=>r.route!=='/song_info')).toHaveLength(0);
});
it('pinning and an open editor retain A while playback changes to B',async()=>{
 await loaded();await userEvent.click(screen.getByRole('button',{name:'Pin editing target'}));await userEvent.click(screen.getByRole('button',{name:'Refresh sample playback'}));expect(screen.getByRole('heading',{level:1})).toHaveTextContent('WHEN SPARKS FLY');expect(screen.getByText(/Sample playback: SUNROOM/)).toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'More song tags'}));await userEvent.click(screen.getByRole('button',{name:'Unpin editing target'}));await waitFor(()=>expect(screen.getByRole('heading',{level:1})).toHaveTextContent('SUNROOM'));expect(screen.getByRole('dialog')).toHaveTextContent('WHEN SPARKS FLY');
});
it('sample mode performs no fetch and distinguishes lookup/loading/ambiguous states',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch');await loaded();
 fireEvent.change(screen.getByLabelText('Scenario'),{target:{value:'Ambiguous match'}});await screen.findByText(/Multiple matching records/);
 fireEvent.change(screen.getByLabelText('Scenario'),{target:{value:'No match'}});await screen.findByRole('heading',{name:'No matching song'});expect(screen.queryByRole('radiogroup',{name:'Rating'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Scenario'),{target:{value:'Loading'}});expect(screen.getByRole('heading',{name:'Loading metadata…'})).toBeInTheDocument();
 expect(fetch).not.toHaveBeenCalled();fetch.mockRestore();
});
it('keeps every approved main tag group visible in its original order',async()=>{
 await loaded();const groups=screen.getAllByRole('group').map(e=>e.querySelector('legend')?.textContent).filter(Boolean);
 expect(groups).toEqual(['Energy','Mood','Appeal','People','Language / content review','Severity','Specific words','Themes','Musical details','To do']);
 for(const name of ['Mainstream','Should be mainstream','nltags','nolang','lang','s','h','n','b','f','p','c','fa','Sensual','Sexual','Vulgar','Violence','Guns','Drugs','Problematic','Autotune','Scratch','Horns','gclean','gdirty','features'])expect(screen.getByRole('checkbox',{name,exact:true})).toBeVisible();
});
it('half-star keyboard selection agrees with numeric value',async()=>{
 await loaded();await userEvent.click(screen.getByRole('radio',{name:'2.5 stars',exact:true}));expect(screen.getByText('2.5 / 5')).toBeInTheDocument();await userEvent.keyboard('{ArrowLeft}');expect(screen.getByText('2 / 5')).toBeInTheDocument();expect(screen.getByRole('radio',{name:'2 stars',exact:true})).toHaveFocus();
});
