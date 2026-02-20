// ============================================
// 打字肉鸽 - 词库数据（基于 popular-english-words 热度排序生成）
// ============================================

import type { WordPool } from '../core/types';

export const WORD_POOL: Record<string, WordPool> = {

  // === 常用词 (Tier 1, 6 字母) ===
  common: {
    words: [
      'member','served','league','become','review','opened','events','create','writer',
      'leader','centre','appear','degree','female','awards','summer','middle','sports',
      'longer','singer','saying','recent','senior','anyone','access','guitar','online',
      'higher','needed','mostly','ground','trying','entire','status','matter','battle','notice',
      'native','border','length','bridge','annual','energy','speedy','nature',
      'adding','raised','claims','master','square','places','scores','except','global',
      'winner','scored','theory','caused','unless','oppose','larger','passed','sister','couple',
      'mainly','nearly','highly','fellow','silver','valley','latter','albums','engine','edited',
      'amount','volume','direct','helped','cities','simple','moving','inside','turned','beyond',
      'remove','earned','target','census','pretty','giving','branch','temple','houses',
      'coming','letter','domain','actual','acting','nearby','income','soviet','spring',
      'issued','troops','bishop','parent','flight','titles','follow','levels','merged',
      'nation','leaves','agreed','remain','castle','serves','method','easily','hosted',
      'normal','prince','forest','effort','estate','campus','parish','copies','travel',
      'unique','double','impact','exists','martin','titled','charge','deputy','accept','posted',
      'bottom','offers','indeed','covers','gained','allows','damage','height','prison','linear',
      'buried','begins','taught','choice','avenue','unable','polish','median','proper','empire',
      'marine','models','refers','doctor','spread','origin','fields','defeat','lyrics',
      'oldest','plants','chosen','revert','chance','murder','passes','memory','topics','myself',
      'safety','anyway','poetry','agency','bronze','losing','comedy','finish',
      'rename','caught','yellow','pieces','secret','option','shared','garden','sounds','bought',
      'detail','trains','oxford','senate','supply','survey','racing','seeing','stands','golden',
      'ending','combat','animal','moment','occurs','string','visual','screen',
      'fought','minute','rating','papers','driver','advice','corner','sexual','speech','starts',
      'values','flying','cancer','launch','credit','causes','mobile','escape',
      'banned','formal','spirit','manner','reader','skills','orders','humans','sector','weekly',
      'sunday','assume','reduce','scenes','charts','twelve','expert','sample','fairly',
      'palace','labour','happen','novels','device','taylor','sought','argued','voting',
      'script','bodies','proved','actors','ensure','motion','decade','ethnic','chapel','legend',
      'signal','merely','owners','tagged','expand','choose','jersey','phrase',
      'column','window','stores','whilst','metres','decide','scheme','arthur','appeal','priest',
      'movies','random','soccer','finals','factor','demand','photos','miller','critic',
      'routes','budget','colour','videos','stages','reform','camera','muslim','threat',
      'severe','attend','twenty','dating','planet','expect','update','narrow','tennis','gender',
      'circle','mining','deaths','vision','filled','missed','headed','couldn','rivers','portal',
      'closer','easier','output','orange','extent','mental','courts','waters','belong','meters',
      'medals','cinema','duties','danish','rescue','losses','spoken','latest',
      'adults','walker','symbol','stayed','statue','wooden','comics','peaked','filmed',
      'upload','colors','medium','eleven','writes','hidden','relief','crisis','holder','cousin',
      'versus','affect','stream','honour','citing','viewed','racial','assist','christ',
      'colony','voters','regard','knight','denied','thread','desire','stable','nobody','rarely',
      'styles','select','themes','behalf','partly','belief','beauty','secure',
      'vessel','rising','treaty','shares','talent','seemed','summit','prefer','eighth',
      'plenty','rounds','picked','obtain','horses','lasted','merger','ruling','allied','agents',
      'wonder','handle','facing','guilty','limits','manual','abroad','violin','spaces','puerto',
      'arrest','tunnel','server','driven','kansas','retail','errors',
      'aspect','funded','crimes','mixing'
    ],
    cost: 5,
    tier: 1,
  },

  // === 技能词 A系列 ===
  a_words: {
    words: [
      'area','main','last','take','near','play','late','land','data','away','idea','mean','base',
      'plan','seat','male','paid','stay','easy','save','maps','pair','boat','baby',
      'safe','lane','salt','april','album','again','media','great','award','areas','value',
      'royal','medal','paris','plant','paper','maybe','roman','basic','mayor',
      'drama','trial','saint','opera','dates','naval','shape','phase','ahead','apart','aware',
      'asian','abuse','dream','aside','canal','email','rival','arena',
      'islam','moral','player','reason','social','search','action','canada'
    ],
    cost: 8,
    tier: 2,
    highlight: 'a',
  },

  // === 技能词 C系列 ===
  c_words: {
    words: [
      'copy','camp','crew','cars','vice','acts','core','card','rich','nice','cold','cite','pick',
      'disc','sock','coal','march','place','music','black','court','close','match','track','force',
      'space','coach','clear','cover','color','chief','topic','block','actor','civil','china',
      'child','claim','scope','comes','coast','cause','score','voice','cited','chart','check',
      'reach','count','clubs','scale','beach','crime','corps','price','chair','occur','comic',
      'ocean','chain','exact','vocal','cycle','cards','czech','acted','click','cable',
      'logic','clock','second','public','source','common','policy','course','active',
      'vocals'
    ],
    cost: 8,
    tier: 2,
    highlight: 'c',
  },

  // === 技能词 D系列 ===
  d_words: {
    words: [
      'died','band','down','edit','side','days','lead','done','body','read','sold','didn','deal',
      'code','dead','mind','dark','lord','lady','drug','duke','wind','yard','laid','door','duty',
      'bird','mode','drop','tied','bold','added','moved','video','round','board','radio','study',
      'sound','lived','ended','solid','dance','avoid','daily','build',
      'drive','mixed','blood','valid','drums','aired','voted','doubt','birds','roads','broad',
      'ready','audio','stood','dated','reads','spend','rapid','rated','saved','aimed',
      'doors','ideal','united','editor','period','listed','modern','placed','studio'
    ],
    cost: 8,
    tier: 2,
    highlight: 'd',
  },

  // === 技能词 E系列 ===
  e_words: {
    words: [
      'keep','best','note','home','case','need','next','came','free','move','seen','come','ever',
      'week','seem','meet','feel','else','lies','tree','feet','deep','mile','edge','eyes','zero',
      'fuel','poem','tone','gene','seek','feed','peer','three','seems','event','teams','refer',
      'needs','seven','merge','agree','green','leave','movie','weeks','serve','speed',
      'greek','scene','meets','queen','piece','creek','peace','theme','fleet','trees','enter',
      'enemy','steel','genre','venue','empty','moves','remix','alive','merit','bible',
      'sweet','metro','elder','feels','wheel','keeps','people','became','center'
    ],
    cost: 8,
    tier: 2,
    highlight: 'e',
  },

  // === 技能词 F系列 ===
  f_words: {
    words: [
      'five','form','file','fact','wife','half','fire','food','fair','fine','face','info','firm',
      'flag','farm','felt','fort','fans','fame','fund','refs','foot','fast','self','roof',
      'fail','fear','first','found','final','field','films','front','staff','fails','focus','forms',
      'fight','fifth','faith','draft','fixed','offer','floor','false','brief','finds','stuff',
      'facts','forum','shift','funds','frame','faced','files','favor','filed','proof','fired',
      'fruit','fresh','family','father','french','office','formed','future',
      'forces','fourth','famous','friend','effect','failed','useful','format','figure','forced'
    ],
    cost: 8,
    tier: 2,
    highlight: 'f',
  },

  // === 技能词 G系列 ===
  g_words: {
    words: [
      'game','good','song','long','king','give','gave','gold','goal','gets','goes','girl','sign',
      'wing','logo','gone','aged','hong','ring','kong','gain','blog','tags','guns','gray','grey',
      'golf','group','align','image','began','using','given','games','pages','going','stage',
      'night','eight','genus','doing','grand','gives','bring','girls','grade','guide','guest',
      'begin','grant','agent','guard','rugby','usage','goods','magic','reign','organ',
      'argue','begun','giant','ridge','drugs','sugar','cargo','angle','grace',
      'angel','august','single','german','region','design','living','signed','groups','images'
    ],
    cost: 8,
    tier: 2,
    highlight: 'g',
  },

  // === 技能词 H系列 ===
  h_words: {
    words: [
      'high','show','held','help','head','ship','hand','hard','shot','hope','host','hold',
      'hits','hour','fish','hook','wish','huge','heat','ohio','holy','shop','path','hair','hero',
      'hear','right','south','north','house','death','third','short','human','light',
      'thing','whole','hours','month','smith','youth','earth','henry','irish','photo','hotel',
      'heavy','birth','share','honor','holds','happy','horse','sixth','chose',
      'homes','hired','depth','heads','phone','shore','crash','choir','touch','school','having',
      'church','others','change','author','months','mother','things','health','rights','behind'
    ],
    cost: 8,
    tier: 2,
    highlight: 'h',
  },

  // === 技能词 J系列 ===
  j_words: {
    words: [
      'jazz','jews','jobs','major','james','judge','jones','joint','joined','jewish','junior',
      'joseph','object','injury','judges'
    ],
    cost: 5,
    tier: 2,
    highlight: 'j',
  },

  // === 技能词 K系列 ===
  k_words: {
    words: [
      'make','book','took','know','york','park','look','rock','lake','mark','lack','bank','kind',
      'peak','kept','rank','jack','risk','task','knew','skin','folk','walk','khan','tank',
      'think','links','works','books','taken','makes','takes','asked','looks','thank','break',
      'frank','broke','korea','speak','stock','quick','banks','knows','clerk','brick',
      'marks','kings','parks','ranks','spoke','talks','lakes','rocks',
      'baker','blank','thanks','making','worked','taking','market','tracks','linked','marked',
      'ranked','unlike','broken','asking','hockey','looked','korean','blocks','strike','struck',
      'turkey'
    ],
    cost: 8,
    tier: 2,
    highlight: 'k',
  },

  // === 技能词 L系列 ===
  l_words: {
    words: [
      'july','film','left','talk','life','club','live','full','love','real','hall','blue','call',
      'hill','till','fall','bill','tell','solo','wall','ball','fell','cell','kill','sell',
      'mill','bell','pool','tall','lose','style','local','small','least','level','label','model',
      'novel','plays','legal','lines','allow','rules','table','lives','miles','fully','males',
      'split','latin','tells','apply','falls','limit','pilot','cells','calls','equal','walls',
      'labor','ruled','hills','usual','plane','imply','blues','hello','shell',
      'apple','mills','played','result','called','island','police','likely','killed'
    ],
    cost: 8,
    tier: 2,
    highlight: 'l',
  },

  // === 技能词 N系列 ===
  n_words: {
    words: [
      'link','june','name','line','find','once','open','upon','none','soon','unit','runs',
      'turn','nine','navy','ones','join','ends','onto','aren','mine','zone','moon','loan','send',
      'dean','known','named','point','young','means','range','union',
      'names','noted','money','index','admin','notes','stone','alone','plans','piano',
      'meant','urban','brand','hands','haven','learn','bands','turns','print','lands','brain',
      'clean','uncle','input','inner','panel','plain','bound','bonus','basin',
      'ninth','number','around','county','person','points','strong','indian'
    ],
    cost: 8,
    tier: 2,
    highlight: 'n',
  },

  // === 技能词 R系列 ===
  r_words: {
    words: [
      'born','part','year','four','road','role','term','army','sure','race','rule','tour','rest',
      'care','room','rate','poor','sort','rose','arms','rare','rise','iron','rail','rear',
      'trip','bear','pure','years','early','large','order','party','story','river','ratio','route',
      'parts','prior','minor','older','write','train','heart','prime','prize','upper','rural',
      'roles','heard','sport','sorry','races','yards','armed','storm','carry','error','super',
      'prove','raise','rooms','harry','prose','motor','reply','roots','solar','layer',
      'strip','truly','roger','marry','former','career','record','report','return'
    ],
    cost: 8,
    tier: 2,
    highlight: 'r',
  },

  // === 技能词 S系列 ===
  s_words: {
    words: [
      'used','user','same','list','said','less','must','lost','post','size','says','arts','star',
      'uses','loss','pass','cost','bass','mass','sons','boys','plus','sets','miss','sale','stub',
      'span','soul','lots','sole','soil','based','times','class','issue','press','users','shows',
      'songs','cases','spent','sense','goals','exist','basis','lists','ships','cross','stars',
      'sites','sales','ideas','visit','sides','seats','louis','squad','leads','guess','glass',
      'helps','poems','costs','essay','jesus','hosts','swiss','steps','posts','signs','boats',
      'bears','tours','chess','series','season','system','issues','museum','simply'
    ],
    cost: 8,
    tier: 2,
    highlight: 's',
  },

  // === 技能词 T系列 ===
  t_words: {
    words: [
      'time','city','team','east','site','text','type','date','past','vote','sent','true','test',
      'stop','told','cast','root','port','poet','plot','step','spot','beat','tool','flat',
      'tend','tony','item','later','edits','state','title','built','total','start','today','debut',
      'terms','units','entry','trade','tried','votes','mount','types','dutch','texas',
      'store','stand','metal','trust','tools','items','adult','extra','truth','bytes',
      'tries','quote','trail','mouth','tests','rates','tribe','texts','steam','outer','plate',
      'trump','tamil','states','little','better','street','artist','stated','attack'
    ],
    cost: 8,
    tier: 2,
    highlight: 't',
  },

  // === 技能词 W系列 ===
  w_words: {
    words: [
      'work','town','west','news','went','want','word','view','wiki','wide','grew','ways','laws',
      'weak','draw','wasn','wood','wars','wins','wild','flow','ward','grow','wait','slow','drew',
      'wave','snow','wine','world','women','water','white','power','wrote','words','woman','lower',
      'owned','shown','wrong','brown','width','owner','twice','worth','tower','views',
      'newly','towns','wants','watch','crown','drawn','flows','wings','grown','waste',
      'welsh','worst','wider','crowd','worse','grows','within','wanted','answer','widely','winter',
      'growth','weight','wouldn','showed','toward','lawyer','powers','switch'
    ],
    cost: 8,
    tier: 2,
    highlight: 'w',
  },

  // === 短词 (2-3 字母, 高速) ===
  short: {
    words: ['so','up','am','go',
      'ok','see','use','don',
      'won','war','end','day','due','get','age','top','set','few','old','son','art','why','men',
      'law','led','say','man','six','add','win','put','air','run','far','red','act','etc','got',
      'big','jan','lot','let','mar','low','yes','ten','dec','car','oct','try','bar','saw','nov',
      'bit','apr','jun','sep','cup','san','aug','feb','web','met','hit','net','jul','row','sea',
      'bad','sun','key','ran','god','map','sir','job','van','los','box','era',
      'nor','cut','ask','bay','tag','usa','oil','vol','die','pay','ice','boy','mon',
      'sat','lee','alt','del','gas','bus','wed','ban','pop','gun','thu','tue',
      'ref','tom','fri','hot','tax','bot','sex','cat','eye','aid',
      'guy','joe','mix','fan','dog','fit','les','fix',
      'jim','bob','fox','pro','dry','ben','gay','leg','sri','sam','ian','buy',
      'dam','sky','max','log','fly','arm','dan','fun','ali','non',
      'kim','duo','ray','mid','aim','ann','rev','lay','odd',
      'ill','tie','sum','tim','lie','bed','las','raw','gap','ips','rio','lap','at','be','by','do','he','if','in','is','it','me','my','no','of','oh','on','or','to','us','we','an','as','hi','ha','ax','ox','ace','ape','arc','ash','ate','awe','bag','bat','bee','bet','bid','bog','bow','bud','bug','bun','cab','cap','cop','cow','cry','cub','den','dew','dig','dim','dip','dot','dub','dud','dye','eel','egg','elm','emu','eve','ewe','fad','fed','fig','fin','fir','foe','fog','fry','fur','gag','gal','gem','gin','gnu','gum','gut','gym','ham'],
    cost: 10,
    tier: 2,
  },

  // === 长词 (7-9 字母, 高分) ===
  long: {
    words: [
      'january','october','several','company','history','support','located','notable','general',
      'comment','english','created','archive','include','members','station','century','british',
      'village','species','service','overlap','country','written','version','example',
      'subject','content','project','various','started','deleted','million','college','similar',
      'current','present','married','program','working','founded','central','instead','special',
      'editors','request','process','records','england','elected','release','related','society',
      'popular','problem','western','council','control','appears','episode','science','provide',
      'usually','players','america','playing','despite','removed','changed','writing','schools',
      'outside','primary','website','average','studies','reached','changes','brother','awarded',
      'thought','largest','believe','leading','private','account','william','edition','germany',
      'results','editing','quality','eastern','officer','network','medical','decided','library',
      'towards','capital','brought','earlier','limited','allowed','certain','systems','chinese',
      'railway','student','culture','regular','artists','russian','italian','success','winning',
      'spanish','covered','manager','overall','looking','natural','feature','attempt','running',
      'clearly','journal','opinion','musical','federal','meaning','foreign','finally',
      'retired','mention','opening','studied','blocked','kingdom','captain','michael','remains',
      'highest','matches','minutes','claimed','complex','actress','meeting','stories','charles',
      'channel','serving','reasons','theatre','entered','leaving','numbers','friends',
      'command','reviews','details','parties','suggest','purpose','husband','variety','academy',
      'mission','parents','african','reading','seasons','victory','renamed','ireland','correct',
      'zealand','getting','picture','ancient','digital','product','surface','offered','concept',
      'address','carried','richard','ability','becomes','follows','justice','reports','founder',
      'quickly','airport','dispute','singles','initial','highway','managed','context','smaller',
      'unknown','improve','produce','greater','discuss','teacher','efforts','shortly','chicago',
      'display','applied','britain','gallery','effects','actions','workers','attacks','females',
      'largely','arrived','exactly','forward','islands','divided','serious','message','leaders',
      'defined','planned','housing','summary','missing','contact','ordered','defense','accused',
      'adopted','passing','receive','figures','showing','affairs','morning','prevent','granted',
      'traffic','concert','letters','opposed','windows','growing','percent','critics','angeles',
      'develop','younger','portion','nations','contain','reduced','painter','explain','neutral',
      'faculty','emperor','obvious','machine','require','surname','stadium','georgia','reserve',
      'animals','classes','winners','warning','florida','methods','pacific','fiction','creator',
      'johnson','regions','sourced','propose','setting','partner','billion','calling','promote',
      'finding','chapter','writers','swedish','keeping','respect','perform','replace',
      'readers','olympic','economy','concern','derived','settled','holding','focused','advance',
      'license','freedom','theater','maximum','talking','disease','visited','grounds','classic',
      'weapons','closely','refused','scoring','commons','protect','stating','failure','fashion',
      'closing','authors','vehicle','killing','dropped','offices','funding','heavily','typical',
      'supreme','persons','invited','decades','brigade','engaged','welcome','factory','causing',
      'reality','seconds','objects','pattern','streets','briefly','express','default','scholar',
      'hundred','adapted','contest','colonel','benefit','trusted','shouldn','climate','liberal',
      'aspects','jackson','singing','nuclear','cricket','courses','merging','updated','visible',
      'notably','joining','premier','assumed','trained','returns','matters','session','defence',
      'weather','learned','measure','entries','biggest','backing','compete','density','stopped',
      'existed','physics','article','conduct','injured','studios','listing','mexican',
      'senator','selling','operate','perfect','painted','toronto','besides','roughly','quarter',
      'helping','chamber','evening','amateur','flowers','praised','capture','whereas',
      'driving','degrees','engines','charges','designs','seventh','helpful','minimum','element',
      'illegal','turkish','factors','unusual','ongoing','removal','testing','regards','pointed',
      'charged','victims','journey','finance','storage','willing','qualify','circuit','soldier',
      'israeli','francis','debuted','drawing','extreme','treated','damaged','achieve','devices',
      'alleged','massive','printed','fighter','wounded','capable','starred','stephen','speaker',
      'landing','suspect','putting','profile','coastal','happens','credits','noticed','cabinet',
      'greatly','trouble','ranking','protein','volumes','warring','amongst','belongs','arrival',
      'turning','formula','extinct','islamic','suicide','vietnam','absence','decline','forming',
      'seeking','fishing','sisters','artwork','markets','december','november','february','american',
      'included','released','national','military','original','received','proposed','building',
      'category','district','children','archived','research','director','students','produced',
      'business','reported','football','division','involved','together','language','position',
      'possible','template','services','recorded','probably','official','actually','returned',
      'question','addition','evidence','reliable','coverage','appeared','includes','previous',
      'featured','northern','directed','daughter','material','minister','provided','southern',
      'personal','features','designed','training','multiple','username','japanese','interest',
      'magazine','followed','election','specific','promoted','european','finished','standard',
      'contains','replaced','remained','required','uploaded','problems','aircraft','complete',
      'overlaps','location','producer','industry','festival','attended','campaign','separate',
      'movement','canadian','practice','numerous','families','decision','response','accounts',
      'hospital','property','regional','majority','recently','intended','selected',
      'starting','directly','defeated','resolves','launched','governor','economic','contract',
      'becoming','cultural','academic','provides','historic','programs','referred','operated',
      'competed','security','chairman','continue','computer','creation','province','relevant',
      'mountain','projects','formerly','believed','software','function','champion','expanded',
      'consider','products','composed','accepted','increase','declined','consists','stations',
      'possibly','acquired','catholic','criteria','creating','positive','elements','existing',
      'sentence','examples','marriage','extended','internet','republic','approach','commonly',
      'critical','episodes','argument','politics','analysis','physical','external','engineer',
      'entirely','activity','officers','composer','soldiers','conflict','regiment','baseball',
      'policies','compared','painting','concerns','assembly','distance','capacity','brothers',
      'expected','sections','congress','combined','versions','carolina','assigned','revealed',
      'advanced','learning','presence','teaching','occurred','behavior','platform','starring',
      'memorial','captured','declared','scotland','attempts','reviewed','ministry','fighting',
      'inspired','slightly','township','musician','resulted','religion','situated','improved',
      'pressure','obtained','purposes','exchange','planning','facility','squadron','approved',
      'scottish','proposal','suffered','virginia','villages','electric','happened','literary',
      'allowing','audience','medicine','solution','reverted','entitled','negative','achieved',
      'founding','arrested','restored','subjects','williams','instance','incident','changing',
      'identity','somewhat','mentions','infantry','requires','sciences','generate','citizens',
      'remember','interior','graduate','whatever','internal','suggests','straight','transfer',
      'indicate','powerful','standing','strongly','heritage','railroad','employed','educated',
      'greatest','entrance','vehicles','criminal','attacked','thinking','domestic','pictures',
      'supposed','occupied','covering','deleting','citation','progress','patients','opposite',
      'affected','maintain','describe','violence','resigned','detailed','regarded','cemetery',
      'removing','rejected','churches','reaching','creative','tropical','normally','ceremony',
      'pakistan','distinct','michigan','speaking','observed','teachers','document','columbia',
      'imperial','survived','victoria','thorough','scholars','hundreds','properly','releases',
      'credited','attached','reviewer','accident','medieval','relative','bringing','adjacent',
      'chemical','identify','strength','earliest','archives','junction','designer','suitable',
      'honorary','attorney','alliance','contrast','claiming','operates','yourself','assessed',
      'sequence','anderson','measures','purchase','supports','admitted','reaction','accurate',
      'prepared','licensed','colonial','counties','crossing','shooting','artistic','atlantic',
      'opinions','portrait','formally','branches','unlikely','activist','carrying','universe',
      'modified','retained','downtown','constant','strategy','arranged','register','illinois',
      'bachelor','repeated','visiting','offering','visitors','sourcing','monument','parallel',
      'disagree','database','thousand','confused','relation','studying','websites',
      'familiar','requests','princess','saturday','approval','entering','merchant','editions',
      'boundary','apparent','aviation','partners','september','following','including','published',
      'different','president','according','community','political','important','currently',
      'education','described','mentioned','available','consensus','announced','character',
      'continued','appointed','developed','australia','nominated','professor','performed',
      'completed','countries','generally','committee','sometimes','reference','beginning',
      'copyright','structure','buildings','institute','companies','initially','recording',
      'executive','presented','supported','preceding','assistant','religious','newspaper',
      'secondary','candidate','languages','attention','christian','financial','regarding',
      'knowledge','operation','necessary','secretary','increased','remaining','otherwise',
      'statement','difficult','questions','graduated','featuring','displayed','primarily',
      'potential','certainly','technical','situation','broadcast','influence','suggested',
      'commander','reporting','additions','prominent','dedicated','direction','typically',
      'involving','establish','standards','territory','equipment','treatment','resources',
      'alongside','residents','authority','agreement','nominator','providing','elections',
      'conducted','confirmed','interview','organized','operating','continues','principal',
      'destroyed','purchased','existence','relations','transport','materials','discussed',
      'connected','positions','promotion','formation','inclusion','estimated','resulting',
      'champions','expansion','extensive','returning','rationale','succeeded','architect',
      'historian','battalion','citations','orchestra','permanent','represent','tradition',
      'effective','attempted','officials','templates','extremely','personnel','worldwide',
      'vandalism','obviously','challenge','converted','programme','condition','classical',
      'locations','receiving','districts','household','municipal','northwest','thousands',
      'publisher','describes','qualified','arguments','southeast','expressed','elizabeth',
      'determine','violation','abandoned','francisco','documents','functions','contained',
      'concerned','centuries','protected','fictional','alexander','selection','requested',
      'northeast','explained','collected','biography','consisted','musicians','criticism',
      'paintings','submitted','scheduled','passenger','interests','extension','cambridge',
      'southwest','redirects','associate','elsewhere','employees','producing','suspected',
      'regularly','residence','installed','christmas','americans','mountains','sentences',
      'finishing','depending','artillery','premiered','temporary','indicates','directors',
      'concluded','committed','referring','paragraph','contested','monitored','norwegian',
      'marketing','excellent','meanwhile','beautiful','addressed','processes',
      'discovery','offensive','advantage','exception','guitarist','practices','corporate',
      'appearing','separated','similarly','delivered','ownership','daughters','economics',
      'editorial','replacing','basically','emergency','indicated','technique','incumbent',
      'franchise','seriously','communist','divisions','childhood','successor',
      'guideline','somewhere','portrayed','principle','insurance','behaviour','singapore',
      'alternate','landscape','defeating','generated','scientist','melbourne','surviving',
      'brazilian','competing','satellite','universal','decisions','immediate','commented'
    ],
    cost: 12,
    tier: 3,
  },

  // === 特殊词 (幻想/游戏主题) ===
  special: {
    words: [
      'phoenix','dragon','wizard','goblin','griffin','hydra','kraken','sprite','djinn',
      'golem','titan','wraith','banshee','unicorn','wyvern','pegasus','chimera','centaur','arcane',
      'elixir','potion','scroll','amulet','enchant','conjure','rune','sigil','vortex','prism',
      'nexus','oracle','mana','ether','ritual','totem','glyph','cipher','mystic','occult','astral',
      'dagger','rapier','mace','scythe','javelin','halberd','gauntlet','buckler','greaves',
      'scepter','trident','katana','quiver','dungeon','quest','tavern','guild','throne',
      'citadel','bastion','rampart','turret','crusade','stealth','paragon','paladin','ranger',
      'cleric','rogue','sorcerer','druid','warlock','bard','monk','archer','tempest','cyclone',
      'tsunami','inferno','blizzard','torrent','cascade','eruption','tremor','monsoon','glacier',
      'volcano','aurora','valor','glory','legacy','destiny','omen','prophecy',
      'mythos','saga','epoch','zenith','nadir','chaos','realm','dynasty','bounty',
      'exile','warden','harbinger'
    ],
    cost: 15,
    tier: 3,
  },
};

// === 获取起始词库（从 Tier 1-2 词池随机抽取 20 词） ===
export function getStarterWords(): string[] {
  const candidates: string[] = [];
  for (const pool of Object.values(WORD_POOL)) {
    if (pool.tier >= 1 && pool.tier <= 2) {
      candidates.push(...pool.words);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, 20);
}

// === 词库统计 ===
export interface DeckStats {
  totalWords: number;
  totalLetters: number;
  avgLength: string;
  freq: Record<string, number>;
  topLetters: [string, number][];
}

export function calculateDeckStats(wordDeck: string[]): DeckStats {
  const freq: Record<string, number> = {};
  let totalLetters = 0;
  const totalWords = wordDeck.length;
  let avgLength = 0;

  for (const word of wordDeck) {
    avgLength += word.length;
    for (const char of word.toLowerCase()) {
      if (/[a-z]/.test(char)) {
        freq[char] = (freq[char] || 0) + 1;
        totalLetters++;
      }
    }
  }

  const avgLengthStr = totalWords > 0 ? (avgLength / totalWords).toFixed(1) : '0';

  const freqPercent: Record<string, number> = {};
  for (const key in freq) {
    freqPercent[key] = Math.round((freq[key] / totalLetters) * 100);
  }

  const sorted = Object.entries(freqPercent).sort((a, b) => b[1] - a[1]);

  return {
    totalWords,
    totalLetters,
    avgLength: avgLengthStr,
    freq: freqPercent,
    topLetters: sorted.slice(0, 8),
  };
}

// === 生成商店可购买的词语 ===
export function generateShopWords(ownedWords: string[]): { word: string; cost: number; highlight?: string }[] {
  const available: { word: string; cost: number; highlight?: string }[] = [];
  const owned = new Set(ownedWords);

  for (const [, pool] of Object.entries(WORD_POOL)) {
    for (const word of pool.words) {
      if (!owned.has(word)) {
        available.push({
          word,
          cost: pool.cost + Math.floor(word.length / 2),
          highlight: pool.highlight,
        });
      }
    }
  }

  return available.sort(() => Math.random() - 0.5).slice(0, 8);
}
