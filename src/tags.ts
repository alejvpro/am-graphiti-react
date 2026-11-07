export type Tag = readonly [label: string, token: string];
const plain = (s: string): Tag[] => s.split(' ').map(t => [t[0].toUpperCase() + t.slice(1), t]);
const bracket = (s: string): Tag[] => s.split(' ').map(t => [t, `[${t}]`]);
export const todo: Tag[] = ['gclean','gdirty','features'].map(t => [t,t]);
export const review = bracket('nltags nolang lang');
export const mainGroups: readonly [string, Tag[]][] = [
 ['Appeal', [['Mainstream','main'],['Should be mainstream','shtream']]],
 ['People', [['Suzible','suzible'],['Genpop','genpop'],['Lari','lari'],['Fam','fam']]],
 ['Language / content review', review],
 ['Severity', [['PG13','[pg13]'],['R','[r]'],['NC17','[nc17]']]],
 ['Specific words', bracket('s h n b f p c fa')],
 ['Themes', [['Sensual','[sensual]'],['Sexual','[sexual]'],['Vulgar','[vulgar]'],['Violence','[violence]'],['Guns','[guns]'],['Drugs','[drugs]'],['Problematic','[problematic]'],['re','[re]'],['Misogyny','[misogyny]'],['LGBTphobic','[lgptphobic]']]],
 ['Musical details', plain('autotune scratch horns')], ['To do', todo]
];
export const moreGroups: readonly [string, Tag[]][] = [
 ['Language sung/spoken', bracket('en es ja ko zh pt')], ['Region', bracket('uk')],
 ['Sound', plain('synthetic acoustic percussion bass bounce')],
 ['Vocals', [['Female','[female]'],['Male','[male]'],['Instrumental','instrumental'],['vnstrumental','vnstrumental']]],
 ['Rap', plain('aggressive fast lyrical story serious')], ['Structure & performance', plain('switch skit interlude live')], ['Time', plain('day night')]
];
export const allowedTags = new Set([...mainGroups,...moreGroups].flatMap(([,tags])=>tags.map(([,token])=>token)).concat(['flight','prop','strack']));
export const collections = ['Suzy','Fam','Sleep','World','Instrumentality','Evening Voices','Soul Food','Summertime','Future Bounce','White Lightning','Take Flight'];
