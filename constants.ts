import { Article, BreakingNews, Category, SiteSettings } from './types';

// These serve as defaults if no custom settings are saved
export const APP_NAME = "Khabar Kal Tak"; 
export const APP_TAGLINE = "Chhattisgarh's Most Trusted Digital Voice";

export const DEFAULT_SETTINGS: SiteSettings = {
  appName: APP_NAME,
  tagline: APP_TAGLINE,
  description: "Khabar Kal Tak is Chhattisgarh's fastest-growing digital news network, bringing you the latest on politics, crime, and development.",
  contactEmail: "editor@kktnews.in",
  contactPhone: "+91 98765 43210",
  address: "2nd Floor, Civic Center, Bhilai, Chhattisgarh, 490006",
  socials: {
    facebook: "#",
    twitter: "#",
    instagram: "#",
    youtube: "#"
  },
  tickerSpeed: 30
};

export const MOCK_BREAKING_NEWS: BreakingNews[] = [
  { id: '1', text: 'रायपुर स्मार्ट सिटी परियोजना के लिए सीएम ने नए रोडमैप की घोषणा की।' },
  { id: '2', text: 'बस्तर संभाग में अगले 48 घंटों के लिए भारी बारिश की चेतावनी।' },
  { id: '3', text: 'हाईकोर्ट ने खनन नियमों को सख्त करने का आदेश दिया।' },
  { id: '4', text: 'सीजीपीएससी परिणाम घोषित: टॉपर्स की सूची यहाँ देखें।' },
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: '101',
    title: 'छत्तीसगढ़ में रोजगार बढ़ाने के लिए नई औद्योगिक नीति',
    excerpt: 'राज्य सरकार ने एक व्यापक औद्योगिक नीति का अनावरण किया है जिसका उद्देश्य अगले वित्तीय वर्ष में 50,000 से अधिक नौकरियां पैदा करना है।',
    content: 'रायपुर: राज्य की अर्थव्यवस्था को मजबूत करने के लिए एक महत्वपूर्ण कदम में, छत्तीसगढ़ सरकार ने आज अपनी नई औद्योगिक नीति 2024 की घोषणा की। नीति सतत विकास, एमएसएमई को बढ़ावा देने और इस्पात और बिजली क्षेत्रों में बड़े पैमाने पर निवेश आकर्षित करने पर केंद्रित है। मुख्यमंत्री ने प्रेस कॉन्फ्रेंस के दौरान कहा, "हमारा लक्ष्य छत्तीसगढ़ को मध्य भारत का औद्योगिक केंद्र बनाना है।" आईटी और कृषि क्षेत्रों में स्टार्टअप्स के लिए विशेष प्रोत्साहन दिए जा रहे हैं।',
    category: Category.STATE,
    author: 'राजेश वर्मा',
    date: '24 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1572910358198-2730d5ee395a?auto=format&fit=crop&w=800&q=80',
    views: 12050,
    slug: 'employment-policy-chhattisgarh',
    created_at: new Date('2023-10-24').toISOString()
  },
  {
    id: '102',
    title: 'राजनीतिक घमासान: विधानसभा सत्र हंगामे के साथ शुरू',
    excerpt: 'विपक्ष ने धान खरीद में देरी पर जवाब मांगा, जिसके कारण सदन को अस्थायी रूप से स्थगित करना पड़ा।',
    content: 'छत्तीसगढ़ विधानसभा का मानसून सत्र आज हंगामेदार रहा। विपक्षी नेताओं ने किसानों को धान खरीद भुगतान में कथित देरी के विरोध में वॉकआउट किया। अध्यक्ष ने शांति की अपील की, लेकिन नारे जारी रहे जब तक कि सदन को दोपहर 2 बजे तक स्थगित नहीं कर दिया गया। विश्लेषकों का अनुमान है कि चुनाव नजदीक आने के साथ सत्र गरमाया रहेगा।',
    category: Category.POLITICS,
    author: 'सुनीता शर्मा',
    date: '23 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=800&q=80',
    views: 13400,
    slug: 'political-uproar-assembly',
    created_at: new Date('2023-10-23').toISOString()
  },
  {
    id: '103',
    title: 'बिलासपुर पुलिस ने अवैध शराब के कारोबार पर की कार्रवाई',
    excerpt: 'आधी रात के अभियान में, पुलिस ने 500 लीटर से अधिक अवैध शराब जब्त की और तीन प्रमुख गुर्गों को गिरफ्तार किया।',
    content: 'गुप्त सूचना पर कार्रवाई करते हुए, बिलासपुर पुलिस ने शहर के बाहरी इलाकों में तीन स्थानों पर छापेमारी की। एसपी बिलासपुर के नेतृत्व में चलाए गए अभियान के परिणामस्वरूप आगामी त्योहारों के दौरान वितरण के लिए अवैध शराब का एक बड़ा जखीरा जब्त किया गया। एसपी ने पुष्टि की, "हम ऐसी गतिविधियों के लिए जीरो टॉलरेंस रखते हैं।',
    category: Category.CRIME,
    author: 'क्राइम डेस्क',
    date: '22 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1589994160839-163cd2b5ca94?auto=format&fit=crop&w=800&q=80',
    views: 12890,
    slug: 'bilaspur-police-liquor-raid',
    created_at: new Date('2023-10-22').toISOString()
  },
  {
    id: '104',
    title: 'आरटीआई खुलासा: ग्रामीण विकास योजना में फंड का उपयोग नहीं',
    excerpt: 'कार्यकर्ता अमित जोगी द्वारा दायर एक आरटीआई आवेदन से पता चलता है कि ग्रामीण सड़कों के लिए आवंटित धन का 40% खर्च नहीं किया गया है।',
    content: 'एक आरटीआई प्रश्न के माध्यम से एक चौंकाने वाला खुलासा सामने आया है। जिले में प्रधानमंत्री ग्राम सड़क योजना के लिए भारी आवंटन के बावजूद, वित्तीय वर्ष 2022-23 के लिए धन का लगभग 40% अनुपयोगी बना हुआ है। स्थानीय प्रशासन "लॉजिस्टिकल मुद्दों" और "मानसून की देरी" को प्राथमिक कारण बताता है, लेकिन नागरिक जवाबदेही की मांग कर रहे हैं।',
    category: Category.RTI,
    author: 'अमित जोगी (नागरिक पत्रकार)',
    date: '21 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1585829365234-28c63c47b3ce?auto=format&fit=crop&w=800&q=80',
    views: 15600,
    slug: 'rti-reveal-rural-funds',
    created_at: new Date('2023-10-21').toISOString()
  },
  {
    id: '105',
    title: 'भर्ती अभियान: पुलिस विभाग में 2000 रिक्तियां',
    excerpt: 'उम्मीदवारों के लिए बड़ी खबर! राज्य पुलिस विभाग ने कांस्टेबल भर्ती के लिए अधिसूचना जारी कर दी है।',
    content: 'छत्तीसगढ़ पुलिस विभाग ने आधिकारिक तौर पर 2,000 कांस्टेबलों की भर्ती के लिए अधिसूचना जारी कर दी है। आवेदन प्रक्रिया अगले सप्ताह शुरू होगी। 18-28 वर्ष की आयु के पात्र उम्मीदवार आधिकारिक पोर्टल के माध्यम से ऑनलाइन आवेदन कर सकते हैं। शारीरिक दक्षता परीक्षण अगले साल की शुरुआत में निर्धारित हैं।',
    category: Category.JOBS,
    author: 'एजुकेशन डेस्क',
    date: '20 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
    views: 18000,
    slug: 'police-recruitment-2000-vacancies',
    created_at: new Date('2023-10-20').toISOString()
  },
  {
    id: '106',
    title: 'दंतेवाड़ा कला महोत्सव ने पर्यटकों को मंत्रमुग्ध किया',
    excerpt: 'आदिवासी कला और नृत्य केंद्र में रहे क्योंकि हजारों लोग वार्षिक सांस्कृतिक उत्सव में उमड़ पड़े।',
    content: 'दंतेवाड़ा कला महोत्सव में बस्तर की समृद्ध सांस्कृतिक विरासत पूरी तरह से प्रदर्शित की गई। देश भर के पर्यटकों ने गौर नृत्य का आनंद लिया और प्रामाणिक डोकरा कलाकृतियां खरीदीं। इस उत्सव का उद्देश्य क्षेत्र में इको-टूरिज्म को बढ़ावा देना है।',
    category: Category.LOCAL,
    author: 'प्रिया सिंह',
    date: '19 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80',
    views: 12450,
    slug: 'dantewada-art-festival',
    created_at: new Date('2023-10-19').toISOString()
  },
  {
    id: '107',
    title: 'भारत बनाम ऑस्ट्रेलिया: विश्व कप फाइनल का पूर्वावलोकन',
    excerpt: 'अहमदाबाद में होने वाले महामुकाबले के लिए मंच तैयार है। भारत और ऑस्ट्रेलिया के बीच खिताबी भिड़ंत पर सबकी नजरें टिकी हैं।',
    content: 'अहमदाबाद: नरेंद्र मोदी स्टेडियम में क्रिकेट विश्व कप फाइनल के लिए दुनिया भर के प्रशंसक उमड़ पड़े हैं। टूर्नामेंट में अजेय रही टीम इंडिया का सामना मजबूत ऑस्ट्रेलियाई टीम से है। विशेषज्ञों का अनुमान है कि दूसरी पारी में ओस की भूमिका अहम होगी। कप्तान रोहित शर्मा ने प्रेस कॉन्फ्रेंस में आत्मविश्वास जताया।',
    category: Category.SPORTS,
    author: 'स्पोर्ट्स डेस्क',
    date: '18 नवंबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
    views: 19200,
    isTrending: true,
    slug: 'india-vs-australia-world-cup-final',
    created_at: new Date('2023-11-18').toISOString()
  },
  {
    id: '108',
    title: 'एशियाई खेल: छत्तीसगढ़ के एथलीटों ने बढ़ाया मान',
    excerpt: 'एशियाई खेलों में तीरंदाजी और एथलेटिक्स में पदक जीतकर राज्य के खिलाड़ियों ने देश का नाम रोशन किया है।',
    content: 'हांगझोउ: छत्तीसगढ़ के लिए गर्व के क्षण में, दो एथलीटों ने चल रहे एशियाई खेलों में पदक हासिल किए हैं। राज्य सरकार ने विजेताओं के लिए नकद पुरस्कार और सरकारी नौकरियों की घोषणा की है। मुख्यमंत्री ने वीडियो कॉल के जरिए उन्हें बधाई दी और उन्हें "राज्य का गौरव" बताया।',
    category: Category.SPORTS,
    author: 'रवि कुमार',
    date: '15 अक्टूबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
    views: 13200,
    slug: 'asian-games-chhattisgarh-athletes',
    created_at: new Date('2023-10-15').toISOString()
  },
  {
    id: '109',
    title: 'ब्लॉकबस्टर रिलीज: "टाइगर 3" ने बॉक्स ऑफिस रिकॉर्ड तोड़े',
    excerpt: 'सलमान खान की फिल्म "टाइगर 3" ने बॉक्स ऑफिस पर तहलका मचा दिया है, सिर्फ दो दिनों में 100 करोड़ से ज्यादा की कमाई की।',
    content: 'मुंबई: त्योहारी सीजन ने "टाइगर 3" की बंपर ओपनिंग के साथ फिल्म उद्योग में खुशी की लहर दौड़ दी है। सुबह से ही सिनेमाघरों के बाहर प्रशंसकों की कतारें लगी हुई हैं। ट्रेड एनालिस्ट्स का अनुमान है कि यह साल की सबसे ज्यादा कमाई करने वाली फिल्मों में से एक होगी। एक्शन सीक्वेंस और कैमियो अपीयरेंस की काफी तारीफ हो रही है।',
    category: Category.BOLLYWOOD,
    author: 'मनोरंजन ब्यूरो',
    date: '14 नवंबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    views: 18500,
    isTrending: true,
    slug: 'tiger-3-box-office-records',
    created_at: new Date('2023-11-14').toISOString()
  },
  {
    id: '110',
    title: 'इस वीकेंड देखें ये वेब सीरीज',
    excerpt: 'थ्रिलर से लेकर रोमांटिक कॉमेडी तक, यहां उन टॉप 5 वेब सीरीज की सूची दी गई है जो इस हफ्ते ओटीटी प्लेटफॉर्म पर रिलीज हो रही हैं।',
    content: 'अगर आप इस वीकेंड बिंज-वॉच करने की योजना बना रहे हैं, तो हमारे पास आपके लिए बेहतरीन सुझाव हैं। नेटफ्लिक्स पर नई क्राइम थ्रिलर को काफी अच्छी समीक्षा मिल रही है, जबकि अमेज़न प्राइम एक हल्का-फुल्का पारिवारिक ड्रामा पेश कर रहा है। प्ले बटन दबाने से पहले हमारी विस्तृत समीक्षा और रेटिंग देखें।',
    category: Category.BOLLYWOOD,
    author: 'प्रिया सिंह',
    date: '12 नवंबर, 2023',
    imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
    views: 12100,
    slug: 'top-web-series-weekend',
    created_at: new Date('2023-11-12').toISOString()
  }
];

export const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Chhattisgarh News', path: '/category/state' },
  { label: 'Nation Update', path: '/category/politics' },
  { label: 'Crime', path: '/category/crime' },
  { label: 'Submit Tip or Complaint', path: '/rti' },
  { label: 'Jobs', path: '/category/jobs' },
  { label: 'Sports', path: '/category/sports' },
  { label: 'Entertainment', path: '/category/bollywood' },
  { label: 'Lifestyle', path: '/category/lifestyle' },
  { label: 'Viral Today', path: '/category/viral' },
  { label: 'War Room', path: '/category/war-room' },
];
