import fs from 'fs';

const allocations = JSON.parse(fs.readFileSync('data/allocations.json', 'utf8'));

const inputRaw = `1	Shreekant Sanghi	Internal (RNSIT)	7568298793	shreekantsanghi24aiml@rnsit.ac.in	LOK sabha	Chirag Paswan
2	Rusheel Bhargav NM	External	9972265326	bhargavrusheel24@gmail.com	DISEC	Poland
3	Mayur Navaratna	Internal (RNSIT)	9108418248	manasa.nm@gmail.com	UNSC	Rwanda
4	Ayush Kumar	Internal (RNSIT)	7061118560	ayushkumarrk1958@gmail.com	disec	malaysia
5	Sankalp C Pai	Internal (RNSIT)	9902514196	sankalpcpai25cy@rnsit.ac.in	lok sabha	Bandi Sanjay Kumar
6	Priyanshu Jha	Internal (RNSIT)	9953722652	priyanshujha9774@gmail.com	lok sabha	Dayanidhi Maran
7	Mayank Kubsad	Internal (RNSIT)	9035756337	kubsadmayank02082008@gmail.com	UNHRC	Iraq
8	Gourav	Internal (RNSIT)	7082673580	gahlawatgourav439@gmail.com	UNHRC	Republic of Estonia
9	Nandini Bhatt	Internal (RNSIT)	8951167700	nandinibhatt423@gmail.com	UNHRC	Slovenia
10	Mohammed Aayan	External	7019673900	aayanmohammed341@gmail.com	DISEC	Argentina
11	Aditi G	Internal (RNSIT)	9180226296	aditig752008@gmail.com	lok sabha	Saugata Roy
12	Aditya Kumar	Internal (RNSIT)	8318195890	adityakumar80049@gmail.com	lok sabha	Sarbananda Sonowal
13	Charith G	Internal (RNSIT)	7019623366	charithgs2008@gmail.com	lok sabha	T R Baalu
14	Haniel Samson A	External	9655142195	itzhanielsamson@gmail.com	UNHRC	Kingdom of Spain
15	Arsh Saxena	External	6396689873	arshsaxena168@gmail.com	UNODC	Republic of the Philippines
16	Gouravi Nayak	External	7019959659	nayakgouravigagan@gmail.com	lok sabha	Dharmendra Pradhan
17	Eshaan Hebbar	Internal (RNSIT)	9920138442	eshaanhebbar.2008@gmail.com	DISEC	Mongolia
18	GARGI MOHAN	Internal (RNSIT)	8340782602	gargimohan27@gmail.com	UNODC	Austria
19	Chethana M.L	Internal (RNSIT)	9481003855	chethanamathr@gmail.com	UNODC	Italy
20	Satvik  G	Internal (RNSIT)	8123701905	satvikg2026@gmail.com	lok sabha	rajiv ranjan singh
21	Hajira Tamanna M H	External	7676226678	tamannahajira777@gmail.com	IP	the hindu 
22	Mukund S BELAWADI	Internal (RNSIT)	7892311234	mukundbelawadi@gmail.com	DISEC	UAE
23	K S Bhavin	Internal (RNSIT)	9611549352	bhavinsrikant@gmail.com	DISEC	Mexico
24	Siddharth M	Internal (RNSIT)	9019068759	sidd072k6@gmail.com	UNHRC	Republic of Korea
25	Poojitha Pujari	External	6302190997	pujaripoojitha11@gmail.com	UNODC	Federal Republic of Germany
26	Gayathri Kasiraja	External	9036925580	gayathrikasiraja7@gmail.com	UNODC	UK
27	Namratha G	Internal (RNSIT)	8747938415	namratha.1823@gmail.com	UNSC	Libya
28	Debangshu Som	Internal (RNSIT)	9098988300	debangshucontact@gmail.com	UNHRC	Bolivia
29	Riya B Patel	Internal (RNSIT)	9663402308	riyabpatel25cs@rnsit.ac.in	UNODC	Kingdom of Belgium
30	Pavani R	Internal (RNSIT)	7676093364	pavaniraghu537@gmail.com	UNODC	Netherlands
31	G Gautham Vas	External	9945613706	g.gauthamvas@gmail.com	DISEC	Ireland
32	Annika Chourasia	External	7975220160	annikachourasia@gmail.com	UNODC 	Brazil
33	Vibha S	Internal (RNSIT)	7353655556	vibhashashi1@gmail.com	UNHRC	Kenya
34	Rishi Dulhani	External	9096780763	rishidulhani7070@gmail.com	UNODC	Finland
35	Saif Ahmed Shaik	Internal (RNSIT)	9632052705	saifshk2007@gmail.com	DISEC	Socialist Republic of Viet Nam
36	Vinayak rao	External	8467093736	vinayak6rao@gmail.com	lok sabha	Kodikunnil Suresh
37	Thanmayee Valekar	Internal (RNSIT)	7338317574	thanmayeevalekar445@gmail.com	UNODC	Grand Duchy of Luxembourg
38	Srishti Krishna	External	7760145153	Srishti Krishna	UNHRC	Chile
39	Varun Km	Internal (RNSIT)	9731882189	varunkm2020@gmail.com	UNODC	USA
40	Ashish	External	8861066040	ashishjitarwal@gmail.com	DISEC	Russia
41	RASHMI M KABADI	Internal (RNSIT)	9591936752	rashmi.m.kabadi@gmail.com	UNHRC	DRC
42	Chinmayi V Hegde	Internal (RNSIT)	8431534438	chinmayivhegde25ci@rnsit.ac.in	UNODC	Laos
43	Braghadeesh Ruban	External	7092339204	braghadeesh190807@gmail.com	Lok Sabha	Basavaraj Bommai
44	Aaruni Mohan Shastri	External	6362328147	shastriaaruni@gmail.com	UNHRC	Republic Of India
45	Utkarsh Sachin Joshi	Internal (RNSIT)	7769055540	jutkarsh809@gmail.com	UNSC	Hashemite Kingdom of Jordan
46	S Sivani	External	9845259494	s.sivani@cmr.edu.in	LOK SABHA	Harsimrat Kaur Badal
47	Dhanush Prabhakaran	Internal (RNSIT)	9108415859	dhanushprabhakaran08@gmail.com	DISEC	New Zealand
48	Luthf Riddhi Chhetri	External	8653264717	luthfchhetri@gmail.com	UNHRC	Japan
49	Abhishek Choudhary	External	8974752254	sneakgameryt@gmail.com	DISEC	China
50	Mohamed Akeef	External	9900291991	autochronicleswithakeef@gmail.com	UNHRC	Italian republic
51	Mishti Sunil Parte	External	9108197585	mishti.parte@gmail.com	DISEC	Republic Of Korea
52	Yuktha Sai V Reddy	External	9663123209	yukthasvr@gmail.com	UNHRC	Dominican Republic
53	Lucky	Internal (RNSIT)	6350654085	lucky25ci@rnsit.ac.in	UNHRC	French Republic
54	Kshitij Bharadwaj	Internal (RNSIT)	8660325364	kshitijbharadwaj22@gmail.com	UNSC	Saudi Arabia
55	Shubhanga B	Internal (RNSIT)	6363984553	shubhangabg@gmail.com	UNODC	Australia
56	Harish L Jadhav	Internal (RNSIT)	9148015908	harishlj001@gmail.com	DISEC	Italian Republic
57	Chahat Chhajer	Internal (RNSIT)	9844192705	chhajerchahat@gmail.com	UNODC	Spain
58	Shishira K S	External	6360785295	shishirasubhash27@gmail.com	IPC	Press Trust of India
59	Arundhati Nagendra	Internal (RNSIT)	7624824154	arundhati.nagendra08@gmail.com	DISEC	Portugal
60	Pranati Pandit	Internal (RNSIT)	7483980549	panditpranati25@gmail.com	UNHRC	Brazil
61	Nainika R	Internal (RNSIT)	9880106968	nainika.raghav@gmail.com	UNODC	Malta
62	Shreyas DB	External	9844076677	shreyasdbofficial@gmail.com	DISEC	USA
63	Sameeksha S	External	7975371688	sameeksha1906@gmail.com	DISEC	UK
64	ADITYA S	Internal (RNSIT)	9900374151	trazy.adi@gmail.com	DISEC	Saudi Arabia
65	Aaditya Rao	External	9141054254	aaditya05rao@gmail.com	UNODC	UAE
66	Harshitha R	External	7019281977	harshitha6100@gmail.com	UNSC	Türkiye
67	Manasa S	External	9380164499	manasa.s0906@gmail.com	UNODC	Thailand`;

const rows = inputRaw.trim().split('\n').filter(r => r.trim());
console.log('Total input rows:', rows.length);

let matchedCount = 0;
let errors = 0;

for (const r of rows) {
  const parts = r.split('\t').map(s => s.trim().replace(/^"|"$/g, ''));
  if (parts.length < 7) continue;
  const [sno, name, type, phone, email, comm, port] = parts;
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  const found = allocations.find(a => 
    (a.phone && a.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone) ||
    (a.email && a.email.toLowerCase() === email.toLowerCase()) ||
    (a.delegate_name && a.delegate_name.toLowerCase() === name.toLowerCase())
  );
  if (found) {
    matchedCount++;
    // verify portfolio matching
    const normPort = port.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundPort = (found.allocated_portfolio || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!foundPort.includes(normPort) && !normPort.includes(foundPort)) {
      console.warn(`[MISMATCH PORTFOLIO] #${sno} ${name}: Input "${port}" vs Master "${found.allocated_portfolio}"`);
      errors++;
    }
  } else {
    console.error(`FAILED TO FIND: #${sno} ${name} (${email})`);
    errors++;
  }
}

console.log(`\nVerification Result: ${matchedCount}/67 verified with ${errors} discrepancies.`);
