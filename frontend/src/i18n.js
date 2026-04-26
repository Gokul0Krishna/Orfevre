import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      sidebar: {
        dashboard: "Dashboard",
        jobconnect: "JobConnect",
        profile: "Profile",
        bazaarpulse: "BazaarPulse",
        gramlens: "GramLens",
        settings: "Settings",
        support: "Support",
        user_profile: "User Profile",
        youth_account: "Youth Account"
      },
      header: {
        login: "Login with Google"
      },
      profile: {
        edit_profile: "Edit Profile",
        save_changes: "Save Changes",
        cancel: "Cancel",
        verified_skills: "Verified Skills",
        ai_verified: "AI Verified",
        upload_proof: "Upload proof of work...",
        like: "Like",
        comment: "Comment",
        share: "Share",
        loading: "Loading profile...",
        trust: "Trust",
        skills_info: "Skills marked with a blue badge are AI-verified using proof of work.",
        post_desc: "Just completed another task! Proof of work captured and verified.",
        ai_recommendations: "AI Skill Recommendations",
        top_skill: "Top skill to learn:",
        captured_skill: "Captured Skill",
        newly_verified: "Newly Verified!",
        analyzing: "AI Analyzing Media & Location..."
      },
      skills: {
        hardware_repair: "Hardware Repair",
        network_setup: "Network Setup",
        customer_service: "Customer Service",
        expert: "Expert",
        intermediate: "Intermediate",
        advanced: "Advanced"
      },
      roles: {
        hardware_network_technician: "Hardware & Network Technician"
      },
      location: {
        hubli: "Hubli",
        hubli_karnataka: "Hubli, Karnataka",
        vidya_nagar: "Vidya Nagar, Hubli",
        captured_location: "Captured Location",
        location_disabled: "Location disabled",
        unknown: "Unknown"
      },
      lang_prompt: {
        title: "Select your language",
        subtitle: "Choose a language for your experience",
        save: "Continue"
      }
    }
  },
  hi: {
    translation: {
      sidebar: {
        dashboard: "डैशबोर्ड",
        jobconnect: "जॉब-कनेक्ट",
        profile: "प्रोफ़ाइल",
        bazaarpulse: "बाज़ार-पल्स",
        gramlens: "ग्राम-लेंस",
        settings: "सेटिंग्स",
        support: "सहायता",
        user_profile: "उपयोगकर्ता प्रोफ़ाइल",
        youth_account: "युवा खाता"
      },
      header: {
        login: "Google से लॉगिन करें"
      },
      profile: {
        edit_profile: "प्रोफ़ाइल संपादित करें",
        save_changes: "सेव करें",
        cancel: "रद्द करें",
        verified_skills: "सत्यापित कौशल",
        ai_verified: "AI द्वारा सत्यापित",
        upload_proof: "काम का प्रमाण अपलोड करें...",
        like: "पसंद करें",
        comment: "टिप्पणी",
        share: "शेयर करें",
        loading: "प्रोफ़ाइल लोड हो रही है...",
        trust: "विश्वास",
        skills_info: "नीले बैज वाले कौशल कार्य के प्रमाण का उपयोग करके AI-सत्यापित हैं।",
        post_desc: "अभी एक और काम पूरा किया! कार्य का प्रमाण लिया गया और सत्यापित किया गया।",
        ai_recommendations: "AI कौशल सिफ़ारिशें",
        top_skill: "सीखने के लिए शीर्ष कौशल:",
        captured_skill: "कैप्चर किया गया कौशल",
        newly_verified: "नया सत्यापित!",
        analyzing: "AI मीडिया और स्थान का विश्लेषण कर रहा है..."
      },
      skills: {
        hardware_repair: "हार्डवेयर मरम्मत",
        network_setup: "नेटवर्क सेटअप",
        customer_service: "ग्राहक सेवा",
        expert: "विशेषज्ञ",
        intermediate: "मध्यम",
        advanced: "उन्नत"
      },
      roles: {
        hardware_network_technician: "हार्डवेयर और नेटवर्क तकनीशियन"
      },
      location: {
        hubli: "हुबली",
        hubli_karnataka: "हुबली, कर्नाटक",
        vidya_nagar: "विद्या नगर, हुबली",
        captured_location: "कैप्चर किया गया स्थान",
        location_disabled: "स्थान अक्षम है",
        unknown: "अज्ञात"
      },
      lang_prompt: {
        title: "अपनी भाषा चुनें",
        subtitle: "अपने अनुभव के लिए एक भाषा चुनें",
        save: "आगे बढ़ें"
      }
    }
  },
  mr: {
    translation: {
      sidebar: {
        dashboard: "डॅशबोर्ड",
        jobconnect: "जॉब-कनेक्ट",
        profile: "प्रोफाइल",
        bazaarpulse: "बाजार-पल्स",
        gramlens: "ग्राम-लेन्स",
        settings: "सेटिंग्ज",
        support: "मदत",
        user_profile: "वापरकर्ता प्रोफाइल",
        youth_account: "युवा खाते"
      },
      header: {
        login: "Google सह लॉग इन करा"
      },
      profile: {
        edit_profile: "प्रोफाइल संपादित करा",
        save_changes: "सेव्ह करा",
        cancel: "रद्द करा",
        verified_skills: "सत्यापित कौशल्ये",
        ai_verified: "AI द्वारे सत्यापित",
        upload_proof: "कामाचा पुरावा अपलोड करा...",
        like: "आवडले",
        comment: "टिप्पणी",
        share: "शेअर करा",
        loading: "प्रोफाइल लोड होत आहे...",
        trust: "विश्वास",
        skills_info: "निळ्या बॅजसह कौशल्ये कामाचा पुरावा वापरून AI-सत्यापित आहेत.",
        post_desc: "आत्ताच आणखी एक कार्य पूर्ण केले! कामाचा पुरावा कॅप्चर केला आणि सत्यापित केला.",
        ai_recommendations: "AI कौशल्य शिफारसी",
        top_skill: "शिकण्यासाठी शीर्ष कौशल्य:",
        captured_skill: "कॅप्चर केलेले कौशल्य",
        newly_verified: "नुकतेच सत्यापित!",
        analyzing: "AI मीडिया आणि स्थानाचे विश्लेषण करत आहे..."
      },
      skills: {
        hardware_repair: "हार्डवेअर दुरुस्ती",
        network_setup: "नेटवर्क सेटअप",
        customer_service: "ग्राहक सेवा",
        expert: "तज्ञ",
        intermediate: "मध्यम",
        advanced: "प्रगत"
      },
      roles: {
        hardware_network_technician: "हार्डवेअर आणि नेटवर्क तंत्रज्ञ"
      },
      location: {
        hubli: "हुबळी",
        hubli_karnataka: "हुबळी, कर्नाटक",
        vidya_nagar: "विद्या नगर, हुबळी",
        captured_location: "कॅप्चर केलेले स्थान",
        location_disabled: "स्थान अक्षम केले आहे",
        unknown: "अज्ञात"
      },
      lang_prompt: {
        title: "तुमची भाषा निवडा",
        subtitle: "तुमच्या अनुभवासाठी भाषा निवडा",
        save: "पुढे जा"
      }
    }
  },
  kn: {
    translation: {
      sidebar: {
        dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        jobconnect: "ಜಾಬ್-ಕನೆಕ್ಟ್",
        profile: "ಪ್ರೊಫೈಲ್",
        bazaarpulse: "ಬಜಾರ್-ಪಲ್ಸ್",
        gramlens: "ಗ್ರಾಮ್-ಲೆನ್ಸ್",
        settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
        support: "ಬೆಂಬಲ",
        user_profile: "ಬಳಕೆದಾರರ ಪ್ರೊಫೈಲ್",
        youth_account: "ಯುವ ಖಾತೆ"
      },
      header: {
        login: "Google ಮೂಲಕ ಲಾಗಿನ್ ಮಾಡಿ"
      },
      profile: {
        edit_profile: "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ",
        save_changes: "ಉಳಿಸಿ",
        cancel: "ರದ್ದುಮಾಡಿ",
        verified_skills: "ಪರಿಶೀಲಿಸಿದ ಕೌಶಲ್ಯಗಳು",
        ai_verified: "AI ದೃಢೀಕರಿಸಲಾಗಿದೆ",
        upload_proof: "ಕೆಲಸದ ಪುರಾವೆ ಅಪ್ಲೋಡ್ ಮಾಡಿ...",
        like: "ಇಷ್ಟ",
        comment: "ಕಾಮೆಂಟ್",
        share: "ಹಂಚಿಕೊಳ್ಳಿ",
        loading: "ಪ್ರೊಫೈಲ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
        trust: "ನಂಬಿಕೆ",
        skills_info: "ನೀಲಿ ಬ್ಯಾಡ್ಜ್ ಹೊಂದಿರುವ ಕೌಶಲ್ಯಗಳನ್ನು ಕೆಲಸದ ಪುರಾವೆ ಬಳಸಿ AI-ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
        post_desc: "ಈಗಷ್ಟೇ ಮತ್ತೊಂದು ಕೆಲಸವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿದೆ! ಕೆಲಸದ ಪುರಾವೆ ಸೆರೆಹಿಡಿಯಲಾಗಿದೆ ಮತ್ತು ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
        ai_recommendations: "AI ಕೌಶಲ್ಯ ಶಿಫಾರಸುಗಳು",
        top_skill: "ಕಲಿಯಲು ಉನ್ನತ ಕೌಶಲ್ಯ:",
        captured_skill: "ಸೆರೆಹಿಡಿದ ಕೌಶಲ್ಯ",
        newly_verified: "ಹೊಸದಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ!",
        analyzing: "AI ಮಾಧ್ಯಮ ಮತ್ತು ಸ್ಥಳವನ್ನು ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ..."
      },
      skills: {
        hardware_repair: "ಹಾರ್ಡ್‌ವೇರ್ ರಿಪೇರಿ",
        network_setup: "ನೆಟ್‌ವರ್ಕ್ ಸೆಟಪ್",
        customer_service: "ಗ್ರಾಹಕ ಸೇವೆ",
        expert: "ತಜ್ಞ",
        intermediate: "ಮಧ್ಯಮ",
        advanced: "ಸುಧಾರಿತ"
      },
      roles: {
        hardware_network_technician: "ಹಾರ್ಡ್‌ವೇರ್ ಮತ್ತು ನೆಟ್‌ವರ್ಕ್ ತಂತ್ರಜ್ಞ"
      },
      location: {
        hubli: "ಹುಬ್ಬಳ್ಳಿ",
        hubli_karnataka: "ಹುಬ್ಬಳ್ಳಿ, ಕರ್ನಾಟಕ",
        vidya_nagar: "ವಿದ್ಯಾ ನಗರ, ಹುಬ್ಬಳ್ಳಿ",
        captured_location: "ಸೆರೆಹಿಡಿದ ಸ್ಥಳ",
        location_disabled: "ಸ್ಥಳವನ್ನು ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ",
        unknown: "ತಿಳಿದಿಲ್ಲ"
      },
      lang_prompt: {
        title: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        subtitle: "ನಿಮ್ಮ ಅನುಭವಕ್ಕಾಗಿ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        save: "ಮುಂದುವರಿಯಿರಿ"
      }
    }
  },
  ta: {
    translation: {
      sidebar: {
        dashboard: "முகப்பு",
        jobconnect: "வேலை-இணைப்பு",
        profile: "சுயவிவரம்",
        bazaarpulse: "பஜார்-பல்ஸ்",
        gramlens: "கிராம்-லென்ஸ்",
        settings: "அமைப்புகள்",
        support: "ஆதரவு",
        user_profile: "பயனர் சுயவிவரம்",
        youth_account: "இளைஞர் கணக்கு"
      },
      header: {
        login: "Google மூலம் உள்நுழைக"
      },
      profile: {
        edit_profile: "சுயவிவரத்தைத் திருத்து",
        save_changes: "சேமி",
        cancel: "ரத்துசெய்",
        verified_skills: "சரிபார்க்கப்பட்ட திறன்கள்",
        ai_verified: "AI சரிபார்க்கப்பட்டது",
        upload_proof: "வேலைக்கான சான்றைப் பதிவேற்றவும்...",
        like: "விருப்பம்",
        comment: "கருத்து",
        share: "பகிர்",
        loading: "சுயவிவரம் ஏற்றப்படுகிறது...",
        trust: "நம்பிக்கை",
        skills_info: "நீல நிற பேட்ஜ் கொண்ட திறன்கள் AI-ஆல் சரிபார்க்கப்பட்டவை.",
        post_desc: "மற்றொரு பணியை முடித்தேன்! வேலைக்கான சான்று பதிவு செய்யப்பட்டு சரிபார்க்கப்பட்டது.",
        ai_recommendations: "AI திறன் பரிந்துரைகள்",
        top_skill: "கற்றுக்கொள்ள சிறந்த திறன்:",
        captured_skill: "கைப்பற்றப்பட்ட திறன்",
        newly_verified: "புதிதாக சரிபார்க்கப்பட்டது!",
        analyzing: "AI ஊடகம் மற்றும் இருப்பிடத்தை பகுப்பாய்வு செய்கிறது..."
      },
      skills: {
        hardware_repair: "வன்பொருள் பழுது",
        network_setup: "நெட்வொர்க் அமைப்பு",
        customer_service: "வாடிக்கையாளர் சேவை",
        expert: "நிபுணர்",
        intermediate: "இடைநிலை",
        advanced: "மேம்பட்ட"
      },
      roles: {
        hardware_network_technician: "வன்பொருள் மற்றும் நெட்வொர்க் தொழில்நுட்ப வல்லுநர்"
      },
      location: {
        hubli: "ஹூப்ளி",
        hubli_karnataka: "ஹூப்ளி, கர்நாடகா",
        vidya_nagar: "வித்யா நகர், ஹூப்ளி",
        captured_location: "கைப்பற்றப்பட்ட இருப்பிடம்",
        location_disabled: "இருப்பிடம் முடக்கப்பட்டுள்ளது",
        unknown: "தெரியவில்லை"
      },
      lang_prompt: {
        title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
        subtitle: "உங்கள் அனுபவத்திற்கான மொழியைத் தேர்ந்தெடுக்கவும்",
        save: "தொடரவும்"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
