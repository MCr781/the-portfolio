const baseTranslations = {
    "HOME": "خانه",
    "NEWS": "اخبار",
    "News": "اخبار",
    "PROJECTS": "پروژه‌ها",
    "Projects": "پروژه‌ها",
    "ABOUT": "درباره ما",
    "About Razan": "درباره رازان",
    "CONTACT": "تماس با ما",
    "Contact": "تماس با ما",
    "RAZAN Consulting Engineering": "مهندسان مشاور رازان",
    "ALL": "همه",
    "All": "همه",
    "Residential": "مسکونی",
    "Cultural": "فرهنگی",
    "Healthcare": "درمانی",
    "Health & Care": "درمانی",
    "HEALTH & CARE": "درمانی",
    "Workplace": "اداری",
    "Office": "اداری",
    "OFFICE": "اداری",
    "Urban": "شهری",
    "URBAN": "شهری",
    "Commercial": "تجاری",
    "COMMERCIAL": "تجاری",
    "Apartment": "آپارتمان",
    "Villa": "ویلا",
    "Complex": "مجتمع",
    "COMPLEX": "مجتمع",
    "Interior": "داخلی",
    "INTERIOR": "داخلی",
    "Landscape": "لندسکیپ",
    "LANDSCAPE": "لندسکیپ",
    "Residential / Healthcare": "مسکونی / درمانی",
    "Cultural / Workplace": "فرهنگی / اداری",
    "Healthcare / Urban": "درمانی / شهری",
    "Workplace / Commercial": "اداری / تجاری",
    "Residential / Urban": "مسکونی / شهری",
    "Cultural / Commercial": "فرهنگی / تجاری",
    "Brand": "برند",
    "Brand Philosophy": "فلسفه برند",
    "Resume": "رزومه",
    "Leadership & Resume": "رهبری و رزومه",
    "Team now": "تیم فعلی",
    "Team Now": "تیم فعلی",
    "Team history": "تاریخچه تیم",
    "Team History": "تاریخچه تیم",
    "Design & Construction": "طراحی و ساخت",
    "Competitions": "مسابقات",
    "Sepidar Cultural Center": "مرکز فرهنگی سپیدار",
    "Central Courtyard House": "خانه حیاط مرکزی",
    "Noor Healthcare Center": "مرکز درمانی نور",
    "Lotus Workplace Tower": "برج اداری نیلوفر (لوتوس)",
    "Baran Urban Campus": "پردیس شهری باران",
    "Avin Retail Complex": "مجتمع تجاری آوین",
    "Contemporary Art Gallery": "گالری هنرهای معاصر",
    "Aram Waterfront Residence": "اقامتگاه ساحلی آرام",
    "Razi Specialty Hospital": "بیمارستان تخصصی رازی",
    "Razan Headquarters": "ساختمان مرکزی رازان",
    "Ofogh Civic Plaza": "میدان‌گاه شهری افق",
    "Mehr Shopping Center": "مرکز خرید مهر",
    "Roshan Public Library": "کتابخانه عمومی روشن",
    "Stepped Mountain Villa": "ویلای پلکانی کوهستان",
    "Aban Family Clinic": "کلینیک خانواده آبان",
    "Kaj Innovation Building": "ساختمان نوآوری کاج",
    "City Linear Park": "پارک خطی شهر",
    "Narvan Local Market": "بازار محلی نارون",
    "Experimental Science Museum": "موزه علوم تجربی",
    "Transparent House": "خانه شفاف",
    "Sahel Wellness Center": "مرکز تندرستی ساحل",
    "Saye Office Tower": "برج اداری سایه",
    "Noor Pedestrian Bridge": "پل عابر پیاده نور",
    "Aftab Mixed-use Complex": "مجتمع چندمنظوره آفتاب",
    "Back to Selected Works": "بازگشت به پروژه‌ها",
    "Project Title": "عنوان پروژه",
    "Project Narrative": "شرح پروژه",
    "Location": "مکان",
    "Tehran, Iran": "تهران، ایران",
    "Area": "مساحت",
    "Status": "وضعیت",
    "Designed": "طراحی شده",
    "Completed": "تکمیل شده",
    "Gallery": "گالری",
    "sqm": "متر مربع",
    "Project image 1": "تصویر پروژه ۱",
    "Project image 2": "تصویر پروژه ۲",
    "8,500 sqm": "۸,۵۰۰ متر مربع",
    "9,500 sqm": "۹,۵۰۰ متر مربع",
    "10,500 sqm": "۱۰,۵۰۰ متر مربع",
    "11,500 sqm": "۱۱,۵۰۰ متر مربع",
    "12,500 sqm": "۱۲,۵۰۰ متر مربع",
    "13,500 sqm": "۱۳,۵۰۰ متر مربع",
    "14,500 sqm": "۱۴,۵۰۰ متر مربع",
    "15,500 sqm": "۱۵,۵۰۰ متر مربع",
    "16,500 sqm": "۱۶,۵۰۰ متر مربع",
    "17,500 sqm": "۱۷,۵۰۰ متر مربع",
    "18,500 sqm": "۱۸,۵۰۰ متر مربع",
    "19,500 sqm": "۱۹,۵۰۰ متر مربع",
    "20,500 sqm": "۲۰,۵۰۰ متر مربع",
    "21,500 sqm": "۲۱,۵۰۰ متر مربع",
    "22,500 sqm": "۲۲,۵۰۰ متر مربع",
    "23,500 sqm": "۲۳,۵۰۰ متر مربع",
    "24,500 sqm": "۲۴,۵۰۰ متر مربع",
    "25,500 sqm": "۲۵,۵۰۰ متر مربع",
    "26,500 sqm": "۲۶,۵۰۰ متر مربع",
    "27,500 sqm": "۲۷,۵۰۰ متر مربع",
    "28,500 sqm": "۲۸,۵۰۰ متر مربع",
    "29,500 sqm": "۲۹,۵۰۰ متر مربع",
    "30,500 sqm": "۳۰,۵۰۰ متر مربع",
    "31,500 sqm": "۳۱,۵۰۰ متر مربع",
    "Sepidar Cultural Center is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "مرکز فرهنگی سپیدار با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Central Courtyard House is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "خانه حیاط مرکزی با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Noor Healthcare Center is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "مرکز درمانی نور با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Lotus Workplace Tower is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "برج اداری نیلوفر (لوتوس) با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Baran Urban Campus is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "پردیس شهری باران با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Avin Retail Complex is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "مجتمع تجاری آوین با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Contemporary Art Gallery is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "گالری هنرهای معاصر با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Aram Waterfront Residence is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "اقامتگاه ساحلی آرام با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Razi Specialty Hospital is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "بیمارستان تخصصی رازی با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Razan Headquarters is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "ساختمان مرکزی رازان با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Ofogh Civic Plaza is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "میدان‌گاه شهری افق با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Mehr Shopping Center is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "مرکز خرید مهر با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Roshan Public Library is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "کتابخانه عمومی روشن با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Stepped Mountain Villa is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "ویلای پلکانی کوهستان با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Aban Family Clinic is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "کلینیک خانواده آبان با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Kaj Innovation Building is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "ساختمان نوآوری کاج با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "City Linear Park is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "پارک خطی شهر با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Narvan Local Market is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "بازار محلی نارون با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Experimental Science Museum is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "موزه علوم تجربی با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Transparent House is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "خانه شفاف با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Sahel Wellness Center is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "مرکز تندرستی ساحل با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Saye Office Tower is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "برج اداری سایه با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Noor Pedestrian Bridge is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "پل عابر پیاده نور با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Aftab Mixed-use Complex is shaped around spatial clarity, natural light, and careful integration with its urban context. The design balances functional organization, user experience, and controlled technical detailing.": "مجتمع چندمنظوره آفتاب با وضوح فضایی، بهره‌گیری از نور طبیعی و هماهنگی دقیق با بستر شهری شکل گرفته است. این طرح تعادلی میان سازمان‌دهی عمل‌کردی، تجربه کاربر و جزئیات دقیق فنی برقرار می‌کند.",
    "Design Begins for Sepidar Cultural Center": "آغاز طراحی مرکز فرهنگی سپیدار",
    "Razan Headquarters Research Phase Completed": "تکمیل فاز مطالعاتی ساختمان مرکزی رازان",
    "Razan Joins Urban Architecture Forum": "پیوستن رازان به مجمع معماری شهری",
    "Sustainability Report Released for New Projects": "انتشار گزارش پایداری برای پروژه‌های جدید",
    "Design Team Visits Noor Project Site": "بازدید تیم طراحی از سایت پروژه نور",
    "A New Approach to Healthcare Design": "رویکردی نو در طراحی فضاهای درمانی",
    "International Competition Collaboration Begins": "آغاز همکاری در مسابقات بین‌المللی",
    "Design Quality Control Process Updated": "به‌روزرسانی فرآیند کنترل کیفیت طراحی",
    "Natural Light Leads Recent Project Strategies": "نقش محوری نور طبیعی در استراتژی‌های اخیر پروژه",
    "Razan Visual Archive Development Plan": "طرح توسعه آرشیو بصری رازان",
    "Jun 06, 2026": "۱۶ خرداد ۱۴۰۵",
    "Jun 02, 2026": "۱۲ خرداد ۱۴۰۵",
    "May 29, 2026": "۸ خرداد ۱۴۰۵",
    "May 25, 2026": "۴ خرداد ۱۴۰۵",
    "May 21, 2026": "۳۱ اردیبهشت ۱۴۰۵",
    "May 17, 2026": "۲۷ اردیبهشت ۱۴۰۵",
    "May 13, 2026": "۲۳ اردیبهشت ۱۴۰۵",
    "May 09, 2026": "۱۹ اردیبهشت ۱۴۰۵",
    "May 05, 2026": "۱۵ اردیبهشت ۱۴۰۵",
    "May 01, 2026": "۱۱ اردیبهشت ۱۴۰۵",
    "Back to News": "بازگشت به اخبار",
    "News Narrative": "شرح خبر",
    "This news item documents Razan's ongoing work and presents a clear view of design direction, quality control, and client collaboration.": "این خبر بازتابی از فعالیت‌های جاری رازان بوده و رویکرد شفافی از جهت‌گیری طراحی، کنترل کیفیت و همکاری با کارفرمایان ارائه می‌دهد.",
    "Razan sees architecture as a dialogue between context, function, and human experience. Each project begins with a precise reading of the brief and develops into a clear, buildable, and lasting response.": "رازان معماری را گفت‌وگویی میان بستر، عملکرد و تجربه انسانی می‌داند. هر پروژه با بازخوانی دقیق برنامه آغاز شده و به پاسخی شفاف، قابل ساخت و پایدار تبدیل می‌شود.",
    "Arash Rezaei": "آرش رضایی",
    "Design Director": "مدیر طراحی",
    "Leads concept development, design quality, and coordination between architecture and delivery teams.": "راهبری توسعه کانسپت، کیفیت طراحی و هماهنگی میان تیم‌های معماری و ساخت.",
    "Negar Mohammadi": "نگار محمدی",
    "Project Director": "مدیر پروژه",
    "Oversees planning, client communication, and project delivery schedules.": "نظارت بر برنامه‌ریزی، ارتباط با کارفرمایان و زمان‌بندی تحویل پروژه‌ها.",
    "Sara Kiani": "سارا کیانی",
    "Senior Architect": "معمار ارشد",
    "Develops architectural design and coordinates technical documentation.": "طراحی معماری و هماهنگی مدارک فنی و اجرایی.",
    "Amir Sharifi": "امیر شریفی",
    "Interior Designer": "طراح داخلی",
    "Focuses on spatial experience, materials, and interior detailing.": "تمرکز بر تجربه فضایی، متریال‌ها و جزئیات داخلی.",
    "Leila Naderi": "لیلا نادری",
    "BIM Coordinator": "هماهنگ‌کننده بیم (BIM)",
    "Manages information models and clash coordination.": "مدیریت مدل‌های اطلاعاتی و هماهنگی تداخلات نقشه‌ها.",
    "The Razan team brings together architects, designers, and project managers focused on coordination, technical detail, and spatial quality from concept through delivery.": "تیم رازان متشکل از معماران، طراحان و مدیران پروژه‌ای است که بر هماهنگی، جزئیات فنی و کیفیت فضایی از کانسپت تا تحویل نهایی تمرکز دارند.",
    "Concept design and spatial scenarios": "طراحی کانسپت و سناریوهای فضایی",
    "Construction documentation and detail control": "مستندات ساخت و کنترل جزئیات اجرایی",
    "Architecture, structure, and MEP coordination": "هماهنگی معماری، سازه و تأسیسات",
    "Finalist in Urban Cultural Center Competition": "فینالیست مسابقه طراحی مرکز فرهنگی شهری",
    "Selected proposal for public space design": "طرح برگزیده طراحی فضای عمومی",
    "Special mention for sustainable design approach": "تقدیر ویژه برای رویکرد طراحی پایدار",
    "Main Office Map": "نقشه دفتر مرکزی",
    "Site Visit Map": "نقشه محل کارگاه",
    "Get in Touch": "ارتباط با ما",
    "For collaborations, project inquiries, or meeting coordination, contact Razan through the channels below.": "برای همکاری، درخواست پروژه یا هماهنگی جلسات، از طریق راه‌های ارتباطی زیر با رازان در تماس باشید.",
    "Tel": "تلفن",
    "Mobile": "موبایل",
    "Fax": "فکس",
    "Email": "ایمیل",
    "Address": "آدرس",
    "Valiasr Street, Tehran, Razan Architecture Studio": "تهران، خیابان ولیعصر، دفتر معماری رازان",
    "Name": "نام",
    "Your Name": "نام شما",
    "your@email.com": "ایمیل شما",
    "Message": "پیام",
    "Tell us about your inquiry...": "پیام خود را بنویسید...",
    "Send Message": "ارسال پیام"
};

const translations = {
    "fa": baseTranslations,
    "en": Object.keys(baseTranslations).reduce((acc, key) => { acc[baseTranslations[key]] = key; return acc; }, {})
};

function t(key) {
    if (!key) return '';
    const lang = document.documentElement.lang || 'en';
    if (lang === 'fa' && baseTranslations[key]) {
        return baseTranslations[key];
    }
    return key;
}

function shouldSkipTranslation(node) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    return Boolean(element && element.closest && element.closest('[data-no-translate="true"]'));
}

function walkAndTranslate(node, lang) {
    if (shouldSkipTranslation(node)) return;

    if (node.nodeType === 3) { 
        let text = node.nodeValue.trim().replace(/\s+/g, ' ');
        if (text && translations[lang] && translations[lang][text]) {
            node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), translations[lang][text]);
        }
    } else if (node.nodeType === 1 && !['SCRIPT', 'STYLE', 'SVG'].includes(node.nodeName)) {
        if (node.placeholder && translations[lang] && translations[lang][node.placeholder.trim()]) {
            node.placeholder = translations[lang][node.placeholder.trim()];
        }
        if (node.getAttribute && node.getAttribute('aria-label')) {
            const al = node.getAttribute('aria-label').trim().replace(/\s+/g, ' ');
            if (translations[lang] && translations[lang][al]) {
                node.setAttribute('aria-label', translations[lang][al]);
            }
        }
        if (node.title && translations[lang] && translations[lang][node.title.trim()]) {
            node.title = translations[lang][node.title.trim()];
        }
        node.childNodes.forEach(child => walkAndTranslate(child, lang));
    }
}

const tabs = ['home', 'news', 'projects', 'about', 'contact'];
let newsFilterTimer = 0;
let projectFilterTimer = 0;
let panelSwitchTimer = 0;
let introTimers = [];
let isTabVisible = true;
let introStarted = false;

function switchTab(activeTab) {
    if (!activeTab) return;
    const targetBtn = document.getElementById('nav-btn-' + activeTab);
    const targetPanel = document.getElementById('sec-' + activeTab);
    if (!targetBtn || !targetPanel) return;

    const filterProjects = document.getElementById('sidebar-project-filters');
    const subnavAbout = document.getElementById('sidebar-about-subnav');
    const filterNews = document.getElementById('sidebar-news-filters');
    const globalSocialIcons = document.getElementById('global-social-icons');

    [filterProjects, subnavAbout, filterNews].forEach(el => {
        if (el) {
            el.classList.add('opacity-0', 'pointer-events-none');
            el.classList.remove('opacity-100', 'pointer-events-auto');
        }
    });

    if (globalSocialIcons) {
        if (activeTab === 'home' || activeTab === 'contact') {
            globalSocialIcons.classList.remove('opacity-0', 'pointer-events-none');
            globalSocialIcons.classList.add('opacity-100', 'pointer-events-auto');
        } else {
            globalSocialIcons.classList.add('opacity-0', 'pointer-events-none');
            globalSocialIcons.classList.remove('opacity-100', 'pointer-events-auto');
        }
    }

    if (activeTab === 'projects' && filterProjects) {
        filterProjects.classList.remove('opacity-0', 'pointer-events-none');
        filterProjects.classList.add('opacity-100', 'pointer-events-auto');
    } else if (activeTab === 'about' && subnavAbout) {
        subnavAbout.classList.remove('opacity-0', 'pointer-events-none');
        subnavAbout.classList.add('opacity-100', 'pointer-events-auto');
    } else if (activeTab === 'news' && filterNews) {
        filterNews.classList.remove('opacity-0', 'pointer-events-none');
        filterNews.classList.add('opacity-100', 'pointer-events-auto');
    }

    const currentBtn = document.querySelector('#main-nav [aria-selected="true"]');
    if (currentBtn && currentBtn.id === targetBtn.id) return;
    tabs.forEach(tab => {
        const btn = document.getElementById('nav-btn-' + tab);
        if (!btn) return;
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '-1');
    });
    if (currentBtn) {
        const currentPanelId = currentBtn.getAttribute('aria-controls');
        const currentPanel = currentPanelId ? document.getElementById(currentPanelId) : null;
        if (currentPanel) {
            currentPanel.classList.remove('z-0');
            currentPanel.classList.add('z-10');
            currentPanel.classList.add('opacity-0', 'pointer-events-none');
            currentPanel.classList.remove('opacity-100');
            window.clearTimeout(panelSwitchTimer);
            panelSwitchTimer = window.setTimeout(() => {
                if (currentPanel.classList.contains('opacity-0') && currentPanel !== targetPanel) {
                    currentPanel.classList.remove('z-10');
                    currentPanel.classList.add('z-0');
                }
            }, 260);
        }
    }
    targetBtn.setAttribute('aria-selected', 'true');
    targetBtn.setAttribute('tabindex', '0');
    targetPanel.classList.remove('z-0', 'opacity-0', 'pointer-events-none');
    targetPanel.classList.add('z-10', 'opacity-100');

    if (document.documentElement.lang === 'fa' && (activeTab === 'about' || activeTab === 'contact')) {
        applyLtrToNumbers(targetPanel);
    }
}

function setAboutActive(sectionId) {
    const buttons = document.querySelectorAll('#sidebar-about-subnav button');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-target') === sectionId) {
            btn.classList.add('sidebar-nav-active');
            btn.classList.remove('text-[#8e8e8e]');
        } else {
            btn.classList.remove('sidebar-nav-active');
            btn.classList.add('text-[#8e8e8e]');
        }
    });
}

function scrollToAbout(sectionId) {
    const targetElement = document.getElementById('about-' + sectionId);
    const container = document.getElementById('about-scroll-container');
    if (targetElement && container) {
        const targetTop = Math.max(targetElement.offsetTop - 28, 0);
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
        setAboutActive(sectionId);
    }
}

function filterNews(year, clickedBtn) {
    const list = document.getElementById('news-articles');
    const articles = document.querySelectorAll('.news-article-item');

    const allBtns = document.querySelectorAll('#sidebar-news-filters button');
    allBtns.forEach(btn => btn.classList.remove('sidebar-nav-active'));
    clickedBtn.classList.add('sidebar-nav-active');

    window.clearTimeout(newsFilterTimer);
    if (list) list.classList.add('news-switching');
    newsFilterTimer = window.setTimeout(() => {
        articles.forEach(article => {
            const shouldShow = year === 'all' || article.getAttribute('data-year') === year;
            article.classList.toggle('hidden-news', !shouldShow);
        });
        if (list) {
            requestAnimationFrame(() => { list.classList.remove('news-switching'); });
        }
    }, 180);
}

function filterProjects(filter, clickedBtn) {
    const allBtns = document.querySelectorAll('#sidebar-project-filters button');
    allBtns.forEach(btn => btn.classList.remove('sidebar-nav-active'));
    if (clickedBtn) clickedBtn.classList.add('sidebar-nav-active');

    window.clearTimeout(projectFilterTimer);
    projectFilterTimer = window.setTimeout(() => {
        const cards = document.querySelectorAll('.project-card');
        cards.forEach(card => {
            const categoryIds = (card.getAttribute('data-category-ids') || '').split(' ').filter(Boolean);
            const shouldShow = filter === 'all'
                ? card.getAttribute('data-default-visible') === 'true'
                : categoryIds.includes(filter);

            card.classList.toggle('hidden', !shouldShow);
        });

        document.querySelectorAll('.project-col').forEach(col => {
            col.scrollTop = 0;
        });
    }, 120);
}

function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = document.getElementById('contact-form-status');
    const submit = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (status) {
            status.textContent = '';
            status.classList.remove('text-red-500');
            status.classList.add('text-[#028c85]');
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (submit) submit.disabled = true;

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                credentials: 'same-origin'
            });
            const result = await response.json();

            if (status) {
                status.textContent = result.message || '';
                status.classList.toggle('text-red-500', !response.ok || !result.success);
                status.classList.toggle('text-[#028c85]', response.ok && result.success);
            }

            if (response.ok && result.success) {
                form.reset();
            }
        } catch {
            if (status) {
                status.textContent = document.documentElement.lang === 'fa'
                    ? 'ارسال پیام با خطا روبه‌رو شد.'
                    : 'Message submission failed.';
                status.classList.add('text-red-500');
                status.classList.remove('text-[#028c85]');
            }
        } finally {
            if (submit) submit.disabled = false;
        }
    });
}

function clearIntroTimers() {
    introTimers.forEach(t => clearTimeout(t));
    introTimers = [];
}

const SVG_CENTERS = {
    blue: { x: 421.5, y: 526.5 },
    p1: { x: 152.3, y: 526.9 },
    p3: { x: 309.5, y: 200.9 },
    p4: { x: 532.2, y: 200.5 },
    p5: { x: 643.0, y: 526.6 }
};

function updateIntroPieceOffsets() {
    const wrapper = document.getElementById('intro-logo-wrap');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const scaleX = rect.width / 800;
    const scaleY = rect.height / 786;
    const blueX = SVG_CENTERS.blue.x * scaleX;
    const blueY = SVG_CENTERS.blue.y * scaleY;

    ['p1', 'p3', 'p4', 'p5'].forEach(id => {
        const piece = document.getElementById(`intro-piece-${id}`);
        if (!piece) return;
        const c = SVG_CENTERS[id];
        const finalX = c.x * scaleX;
        const finalY = c.y * scaleY;
        const offX = finalX - blueX;
        const offY = finalY - blueY;
        piece.style.setProperty('--off-x', offX + 'px');
        piece.style.setProperty('--off-y-initial', '0px');
        piece.style.setProperty('--off-y-final', offY + 'px');
    });
}

function measureIntroTarget() {
    const sidebarLogo = document.querySelector('[data-anim-target="logo-container"]');
    const introLogoWrap = document.getElementById('intro-logo-wrap');
    const root = document.documentElement;
    if (!sidebarLogo || !introLogoWrap) return;
    const prevOpacity = sidebarLogo.style.opacity;
    sidebarLogo.style.opacity = '0';
    sidebarLogo.classList.add('logo-no-transition');
    sidebarLogo.setAttribute('data-state', 'idle');
    requestAnimationFrame(() => {
        const sidebarRect = sidebarLogo.getBoundingClientRect();
        const sidebarCenterX = sidebarRect.left + sidebarRect.width / 2;
        const sidebarCenterY = sidebarRect.top + sidebarRect.height / 2;
        const introRect = introLogoWrap.getBoundingClientRect();
        const introCenterX = introRect.left + introRect.width / 2;
        const introCenterY = introRect.top + introRect.height / 2;
        const targetX = sidebarCenterX - introCenterX;
        const targetY = sidebarCenterY - introCenterY;
        const targetScale = sidebarRect.width / introRect.width;
        root.style.setProperty('--intro-fly-x', targetX + 'px');
        root.style.setProperty('--intro-fly-y', targetY + 'px');
        root.style.setProperty('--intro-fly-scale', targetScale.toFixed(4));
        sidebarLogo.style.opacity = prevOpacity;
        sidebarLogo.classList.remove('logo-no-transition');
    });
}

function startIntroSequence() {
    if (introStarted) return;
    introStarted = true;
    clearIntroTimers();
    updateIntroPieceOffsets();

    const overlay = document.getElementById('intro-overlay');
    const textBlock = document.getElementById('intro-text-block');
    const body = document.body;
    if (!overlay) return;

    if (textBlock) textBlock.style.opacity = '0';
    introTimers.push(setTimeout(() => { overlay.classList.add('intro-phase-1'); }, 300));
    introTimers.push(setTimeout(() => { overlay.classList.add('intro-phase-2'); }, 1150));
    introTimers.push(setTimeout(() => { body.classList.add('content-visible'); }, 1300));
    introTimers.push(setTimeout(() => { overlay.classList.add('intro-phase-3'); }, 2000));
    introTimers.push(setTimeout(() => { overlay.classList.add('intro-fade-out'); }, 2800));

    introTimers.push(setTimeout(() => {
        overlay.classList.add('intro-hidden');
        body.setAttribute('data-phase', 'idle');
        const sidebarLogo = document.querySelector('[data-anim-target="logo-container"]');
        if (sidebarLogo) sidebarLogo.setAttribute('data-state', 'idle');
    }, 3600));
}

function snapToIdleLogo() {
    const logo = document.querySelector('[data-anim-target="logo-container"]');
    if (!logo) return;
    logo.classList.add('logo-no-transition');
    logo.setAttribute('data-state', 'idle');
    logo.removeAttribute('data-remix');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { logo.classList.remove('logo-no-transition'); });
    });
}

function applyLtrToNumbers(container) {
    if (!container) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const numPattern = /([+]?[\d\u06F0-\u06F9\u0660-\u0669][\d\u06F0-\u06F9\u0660-\u0669\s\-\+\/\,\.:]*[\d\u06F0-\u06F9\u0660-\u0669][+]?|[\d\u06F0-\u06F9\u0660-\u0669]+[+]?)/;
    const nodesToReplace = [];
    let textNode;

    while ((textNode = walker.nextNode())) {
        const parent = textNode.parentElement;
        if (!parent || parent.closest('[dir="ltr"]') || ['SCRIPT', 'STYLE', 'SVG'].includes(parent.tagName)) {
            continue;
        }
        if (numPattern.test(textNode.nodeValue)) {
            nodesToReplace.push(textNode);
        }
    }

    nodesToReplace.forEach(node => {
        const parent = node.parentNode;
        if (!parent) return;
        const text = node.nodeValue;
        const parts = text.split(/([+]?[\d\u06F0-\u06F9\u0660-\u0669][\d\u06F0-\u06F9\u0660-\u0669\s\-\+\/\,\.:]*[\d\u06F0-\u06F9\u0660-\u0669][+]?|[\d\u06F0-\u06F9\u0660-\u0669]+[+]?)/g);
        const frag = document.createDocumentFragment();

        parts.forEach(part => {
            if (/[\d\u06F0-\u06F9\u0660-\u0669]/.test(part)) {
                const span = document.createElement('span');
                span.setAttribute('dir', 'ltr');
                span.className = 'inline-block num-ltr';
                span.style.direction = 'ltr';
                span.style.unicodeBidi = 'isolate';
                span.textContent = part;
                frag.appendChild(span);
            } else if (part) {
                frag.appendChild(document.createTextNode(part));
            }
        });
        parent.replaceChild(frag, node);
    });
}

function applyLanguageChrome(lang, translateStaticContent = false) {
    const safeLang = lang === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = safeLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = safeLang;

    const introEn = document.getElementById('intro-en');
    const introFa = document.getElementById('intro-fa');
    if (introEn && introFa) {
        if (safeLang === 'fa') {
            introEn.classList.add('hidden');
            introFa.classList.remove('hidden');
        } else {
            introEn.classList.remove('hidden');
            introFa.classList.add('hidden');
        }
    }

    const headerLogo = document.getElementById('header-brand-logo');
    if (headerLogo) {
        headerLogo.src = safeLang === 'fa' ? 'assets/pics/RAZAN Consulting Engineering-persian.svg' : 'assets/pics/RAZAN Consulting Engineering.svg';
    }

    const brandTextEn = document.getElementById('brand-text-en');
    const brandTextFa = document.getElementById('brand-text-fa');
    if (brandTextEn && brandTextFa) {
        if (safeLang === 'fa') {
            brandTextEn.classList.add('hidden');
            brandTextFa.classList.remove('hidden');
        } else {
            brandTextEn.classList.remove('hidden');
            brandTextFa.classList.add('hidden');
        }
    }

    if (translateStaticContent) {
        walkAndTranslate(document.body, safeLang);
    }

    if (safeLang === 'fa') {
        applyLtrToNumbers(document.getElementById('sec-about'));
        applyLtrToNumbers(document.getElementById('sec-contact'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('intro-overlay');
    const body = document.body;
    const logo = document.querySelector('[data-anim-target="logo-container"]');
    const nav = document.getElementById('main-nav');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const aboutContainer = document.getElementById('about-scroll-container');
    const aboutSections = ['brand', 'leadership', 'team', 'history', 'expertise', 'competitions']
        .map(key => document.getElementById('about-' + key)).filter(Boolean);

    const urlParams = new URLSearchParams(window.location.search);
    const initialLang = urlParams.get('lang') === 'fa' ? 'fa' : 'en';
    applyLanguageChrome(initialLang, initialLang === 'fa');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            body.classList.add('page-ready');
            updateIntroPieceOffsets();
            window.addEventListener('resize', updateIntroPieceOffsets);
        });
    });

    const updateNavOrientation = () => {
        if (!nav) return;
        nav.setAttribute('aria-orientation', desktopQuery.matches ? 'vertical' : 'horizontal');
    };
    updateNavOrientation();
    if (typeof desktopQuery.addEventListener === 'function') {
        desktopQuery.addEventListener('change', updateNavOrientation);
    } else if (typeof desktopQuery.addListener === 'function') {
        desktopQuery.addListener(updateNavOrientation);
    }

    const navToPartMap = {
        'home': 'part3',
        'news': 'part4',
        'projects': 'part2',
        'about': 'part5',
        'contact': 'part1'
    };

    const navButtons = tabs.map(tab => document.getElementById('nav-btn-' + tab)).filter(Boolean);

    navButtons.forEach((btn, index) => {
        btn.addEventListener('keydown', event => {
            const isNext = event.key === 'ArrowDown' || event.key === 'ArrowRight';
            const isPrev = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
            const isHome = event.key === 'Home';
            const isEnd = event.key === 'End';
            if (!isNext && !isPrev && !isHome && !isEnd) return;
            event.preventDefault();
            let nextIndex = index;
            if (isNext) nextIndex = (index + 1) % navButtons.length;
            if (isPrev) nextIndex = (index - 1 + navButtons.length) % navButtons.length;
            if (isHome) nextIndex = 0;
            if (isEnd) nextIndex = navButtons.length - 1;
            const targetBtn = navButtons[nextIndex];
            const targetTab = targetBtn.id.replace('nav-btn-', '');
            switchTab(targetTab);
            targetBtn.focus();
        });

        btn.addEventListener('mouseenter', () => {
            const tab = btn.id.replace('nav-btn-', '');
            const partId = navToPartMap[tab];
            const part = document.getElementById(partId);

            if (part && document.body.getAttribute('data-phase') === 'idle') {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        part.classList.add('hover-active');
                    });
                });
            }
        });

        btn.addEventListener('mouseleave', () => {
            const tab = btn.id.replace('nav-btn-', '');
            const partId = navToPartMap[tab];
            const part = document.getElementById(partId);

            if (part) {
                part.classList.remove('hover-active');
            }
        });

        btn.addEventListener('click', () => {
            const tab = btn.id.replace('nav-btn-', '');
            const partId = navToPartMap[tab];
            const part = document.getElementById(partId);

            if (part && document.body.getAttribute('data-phase') === 'idle') {
                part.animate([
                    { transform: 'scale(1.09)' },
                    { transform: 'scale(0.94)' },
                    { transform: 'scale(1.09)' }
                ], {
                    duration: 400,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
                });
            }
        });
    });

    const columns = document.querySelectorAll('.project-col');
    const pausedProjectColumns = new WeakSet();
    const projectColumnTouchTimers = new WeakMap();
    const getVisibleProjectItems = (items) => Array.from(items).filter(item => !item.classList.contains('hidden'));
    const getProjectMeasureItem = (items) => getVisibleProjectItems(items)[0] || Array.from(items)[0] || null;
    const pauseProjectColumn = (col) => {
        window.clearTimeout(projectColumnTouchTimers.get(col));
        projectColumnTouchTimers.delete(col);
        pausedProjectColumns.add(col);
    };
    const resumeProjectColumn = (col, delay = 0) => {
        window.clearTimeout(projectColumnTouchTimers.get(col));
        projectColumnTouchTimers.delete(col);

        if (delay > 0) {
            const timer = window.setTimeout(() => {
                pausedProjectColumns.delete(col);
                projectColumnTouchTimers.delete(col);
            }, delay);
            projectColumnTouchTimers.set(col, timer);
            return;
        }

        pausedProjectColumns.delete(col);
    };

    if (columns.length > 0) {
        columns.forEach((col, index) => {
            const originals = Array.from(col.children);
            for (let i = 0; i < 4; i++) {
                originals.forEach(item => col.appendChild(item.cloneNode(true)));
            }

            col.addEventListener('mouseenter', () => pauseProjectColumn(col));
            col.addEventListener('mouseleave', () => resumeProjectColumn(col));
            col.addEventListener('touchstart', () => pauseProjectColumn(col), { passive: true });
            col.addEventListener('touchend', () => resumeProjectColumn(col, 1500));
            col.addEventListener('touchcancel', () => resumeProjectColumn(col, 1500));

            const direction = (index % 2 === 0) ? 1 : -1;
            requestAnimationFrame(() => {
                if (originals.length > 0) {
                    const measureItem = getProjectMeasureItem(originals);
                    const itemHeight = measureItem ? measureItem.getBoundingClientRect().height : 0;
                    if (itemHeight <= 0) return;
                    const gap = parseInt(window.getComputedStyle(col).gap) || 0;
                    const groupHeight = Math.max(getVisibleProjectItems(originals).length, 1) * (itemHeight + gap);
                    if (direction === -1) {
                        col.scrollTop = groupHeight * 2;
                    } else {
                        col.scrollTop = groupHeight;
                    }
                }
            });

            col.addEventListener('scroll', () => {
                if (originals.length === 0) return;
                const measureItem = getProjectMeasureItem(originals);
                const itemHeight = measureItem ? measureItem.getBoundingClientRect().height : 0;
                if (itemHeight <= 0) return;
                const gap = parseInt(window.getComputedStyle(col).gap) || 0;
                const groupHeight = Math.max(getVisibleProjectItems(originals).length, 1) * (itemHeight + gap);

                if (col.scrollTop >= groupHeight * 3) {
                    col.scrollTop -= groupHeight;
                } else if (col.scrollTop <= groupHeight * 0.5) {
                    col.scrollTop += groupHeight;
                }
            }, { passive: true });
        });

        let currentScrollingCol = 0;
        setInterval(() => {
            const activePanel = document.querySelector('.tab-panel.opacity-100');
            if (isTabVisible && activePanel && activePanel.id === 'sec-projects') {
                let col = null;
                let columnIndex = currentScrollingCol;

                for (let attempt = 0; attempt < columns.length; attempt++) {
                    const candidateIndex = currentScrollingCol;
                    const candidate = columns[candidateIndex];
                    currentScrollingCol = (currentScrollingCol + 1) % columns.length;

                    if (candidate && !pausedProjectColumns.has(candidate)) {
                        col = candidate;
                        columnIndex = candidateIndex;
                        break;
                    }
                }

                if (!col) return;

                const direction = (columnIndex % 2 === 0) ? 1 : -1;

                if (col && col.children.length > 0) {
                    const measureItem = getProjectMeasureItem(col.children);
                    const itemHeight = measureItem ? measureItem.getBoundingClientRect().height : 0;
                    if (itemHeight <= 0) {
                        return;
                    }
                    const gap = parseInt(window.getComputedStyle(col).gap) || 0;
                    const shift = (itemHeight + gap) * direction;

                    col.style.scrollSnapType = 'none';
                    col.scrollBy({ top: shift, behavior: 'smooth' });
                    setTimeout(() => { col.style.scrollSnapType = ''; }, 600);
                }
            }
        }, 2400);
    }

    if (aboutContainer && aboutSections.length > 0) {
        let aboutTicking = false;

        const syncAboutActive = () => {
            const bottomGap = aboutContainer.scrollHeight - aboutContainer.scrollTop - aboutContainer.clientHeight;

            if (bottomGap <= 60) {
                setAboutActive('competitions');
                return;
            }

            const probeLine = aboutContainer.scrollTop + 60;
            let activeId = 'brand';

            aboutSections.forEach(section => {
                if (probeLine >= section.offsetTop) {
                    activeId = section.id.replace('about-', '');
                }
            });

            setAboutActive(activeId);
        };

        setAboutActive('brand');
        syncAboutActive();

        aboutContainer.addEventListener('scroll', () => {
            if (aboutTicking) return;
            aboutTicking = true;
            requestAnimationFrame(() => {
                syncAboutActive();
                aboutTicking = false;
            });
        }, { passive: true });

        window.addEventListener('resize', syncAboutActive);
    }

    measureIntroTarget();
    window.addEventListener('resize', () => {
        clearTimeout(window._resizeDebounce);
        window._resizeDebounce = setTimeout(() => { measureIntroTarget(); }, 300);
    });

    if (prefersReducedMotion) {
        if (overlay) {
            overlay.classList.add('intro-fade-out');
            overlay.classList.add('intro-hidden');
        }
        body.classList.add('content-visible');
        body.setAttribute('data-phase', 'idle');
        if (logo) logo.setAttribute('data-state', 'idle');
        const textBlock = document.getElementById('intro-text-block');
        if (textBlock) textBlock.style.display = 'none';
        snapToIdleLogo();
        introStarted = true;
    } else if (overlay) {
        body.setAttribute('data-phase', 'intro');
        if (logo) logo.setAttribute('data-state', 'idle');
        const triggerIntro = () => startIntroSequence();

        introTimers.push(setTimeout(triggerIntro, 3500));

        overlay.addEventListener('click', triggerIntro, { once: true });
        document.addEventListener('click', function docClickTrigger(e) {
            if (introStarted) return;
            if (e.target === overlay || overlay.contains(e.target)) return;
            triggerIntro();
            document.removeEventListener('click', docClickTrigger);
        }, { once: false });
    }

    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (document.hidden && !introStarted && body.getAttribute('data-phase') !== 'idle') {
            if (overlay) {
                overlay.classList.add('intro-fade-out');
                overlay.classList.add('intro-hidden');
            }
            body.classList.add('content-visible');
            body.setAttribute('data-phase', 'idle');
            if (logo) logo.setAttribute('data-state', 'idle');
            const textBlock = document.getElementById('intro-text-block');
            if (textBlock) textBlock.style.display = 'none';
            snapToIdleLogo();
            introStarted = true;
            clearIntroTimers();
        }
    });

    window.addEventListener('pagehide', () => {
        clearIntroTimers();
    });
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            if (overlay && !introStarted) {
                overlay.classList.add('intro-fade-out');
                overlay.classList.add('intro-hidden');
            }
            body.classList.add('content-visible');
            body.setAttribute('data-phase', 'idle');
            if (logo) logo.setAttribute('data-state', 'idle');
            const textBlock = document.getElementById('intro-text-block');
            if (textBlock) textBlock.style.display = 'none';
            snapToIdleLogo();
            introStarted = true;
            clearIntroTimers();
        }
    });

    const setupProgressBar = (containerSelector, progressId) => {
        const container = document.querySelector(containerSelector);
        const progress = document.getElementById(progressId);
        if (!container || !progress) return;

        const updateProgress = () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            const width = Math.max(5, scrollPercent);
            progress.style.width = width + '%';
        };

        container.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
        window.addEventListener('resize', updateProgress);
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(updateProgress, 600));
        });
    };

    setupProgressBar('#sec-news .scroll-clean', 'progress-news');
    setupProgressBar('#about-scroll-container', 'progress-about');
    setupProgressBar('#sec-contact .scroll-clean', 'progress-contact');

    setupContactForm();
    initHomeMatrix();
});

const projectImages = {
    1: ['angular-leaning-terracotta-glass-museum.jpg', 'colorful-curved-facade-triangular-windows.jpg', 'concrete-cantilever-modernist-corner-facade.jpg', 'curved-concrete-building-blue-glass-windows.jpg', 'curved-modern-glass-building-metal-louvers.jpg'],
    2: ['colorful-curved-facade-triangular-windows.jpg', 'curved-white-building-tall-glass-arch.jpg', 'dark-brutalist-geometric-patterned-facade.jpg', 'darya-shkapina.jpg', 'double-tree-by-hilton-nice-centre.jpg'],
    3: ['concrete-cantilever-modernist-corner-facade.jpg', 'experimenta-science-centre-stoneware-flooring-casalgrande-padana.jpg', 'futuristic-geometric-glass-canopy-copper-facade.jpg', 'geometric-glass-honeycomb-facade.jpg', 'germanys-axel-springer-group.jpg'],
    4: ['curved-concrete-building-blue-glass-windows.jpg', 'harpa-concert-hall-glass-honeycomb-facade.jpg', 'howard-bouchevereau.jpg', 'minimalist-white-architecture-cantilevered-volume.jpg', 'modern-brick-building-corner-windows-sky.jpg'],
    5: ['dark-brutalist-geometric-patterned-facade.jpg', 'modern-cantilevered-office-building-waterfront.jpg', 'modern-white-building-curved-glass-stairs.jpg', 'monochrome-cylindrical-building-geometric-facade.jpg', 'parametric-curved-glass-amber-grid-architecture.jpg'],
    6: ['darya-shkapina.jpg', 'pexels-michael-pointner-134459625-10209033.jpg', 'pierres-vives.jpg', 'rock-and-roll-hall-of-fame-cleveland-architecture.jpg', 'sidra-medicine-hospital-abudhabi-cantilevered-glass.jpg'],
    7: ['double-tree-by-hilton-nice-centre.jpg', 'silver-geometric-origami-metal-facade.jpg', 'stacked-cantilevered-glass-volumes-architecture.jpg', 'stepped-dark-glass-facade-architecture-twilight.jpg', 'undulating-metallic-reflective-architecture.jpg'],
    8: ['experimenta-science-centre-stoneware-flooring-casalgrande-padana.jpg', 'zaha-hadid-heydar-aliyev-center-baku-facade.jpg', 'angular-leaning-terracotta-glass-museum.jpg', 'concrete-cantilever-modernist-corner-facade.jpg', 'curved-modern-glass-building-metal-louvers.jpg'],
    9: ['howard-bouchevereau.jpg', 'colorful-curved-facade-triangular-windows.jpg', 'dark-brutalist-geometric-patterned-facade.jpg', 'double-tree-by-hilton-nice-centre.jpg', 'geometric-glass-honeycomb-facade.jpg']
};

function getRazanNewsDetail(newsId) {
    const details = window.razanNewsDetails || {};
    return details[String(newsId)] || null;
}

function renderNewsDetail(news) {
    const titleEl = document.getElementById('nd-title');
    const dateEl = document.getElementById('nd-date');
    const imageEl = document.getElementById('nd-main-img');
    const descriptionEl = document.getElementById('nd-description');

    if (titleEl) titleEl.innerText = t(news.title) || '';
    if (dateEl) dateEl.innerText = t(news.dateLabel) || '';
    if (descriptionEl) descriptionEl.innerText = t(news.fullDescription) || '';
    setBackgroundImage(imageEl, news.imageUrl);
}

function openNewsDetail(newsId) {
    const news = getRazanNewsDetail(newsId);
    const overlay = document.getElementById('news-detail-overlay');
    if (!news || !overlay) return;

    renderNewsDetail(news);
    overlay.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
    overlay.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
}

function closeNewsDetail() {
    const overlay = document.getElementById('news-detail-overlay');
    if (!overlay) return;

    overlay.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
    overlay.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
}

function openProjectDetailById(projectId) {
    const projectsPanel = document.getElementById('sec-projects');
    if (projectsPanel && !projectsPanel.classList.contains('opacity-100')) {
        switchTab('projects');
    }

    openProjectDetail('', '', '', projectId);
}

function getRazanProjectDetail(projectId) {
    const details = window.razanProjectDetails || {};
    return details[String(projectId)] || null;
}

function setBackgroundImage(element, imageUrl) {
    if (!element) return;
    if (!imageUrl) {
        element.style.setProperty('background-image', 'none', 'important');
        return;
    }
    let normalized = String(imageUrl).trim();
    if (normalized.startsWith('/') && !normalized.startsWith('//')) {
        normalized = normalized.replace(/^\/+/, '');
    }
    element.style.setProperty('background-image', `url("${normalized.replace(/"/g, '\\"')}")`, 'important');
}

function renderProjectDetailItems(container, items) {
    if (!container) return;
    container.innerHTML = '';

    (items || []).forEach(item => {
        const wrapper = document.createElement('div');
        const label = document.createElement('p');
        label.className = 'text-[10px] uppercase tracking-[0.16em] text-[#8e8e8e] mb-1';
        label.textContent = t(item.title) || '';

        const value = document.createElement('p');
        value.className = 'text-sm text-[#474646]';
        value.textContent = t(item.value) || '';

        wrapper.appendChild(label);
        wrapper.appendChild(value);
        container.appendChild(wrapper);
    });
}

function renderProjectGallery(container, items) {
    if (!container) return;
    container.innerHTML = '';

    (items || []).forEach(item => {
        const image = document.createElement('div');
        image.className = 'pd-gallery-img aspect-[4/3] shadow-[0_12px_28px_rgba(71,70,70,0.12)] border border-[#028c85]/30 bg-cover bg-center rounded-[18px]';
        image.setAttribute('role', 'img');
        image.setAttribute('aria-label', item.title || '');
        setBackgroundImage(image, item.imageUrl);
        container.appendChild(image);
    });
}

function renderDynamicProjectDetail(project) {
    const titleEl = document.getElementById('pd-title');
    const metaEl = document.getElementById('pd-meta');
    const mainImgEl = document.getElementById('pd-main-img');
    const descriptionEl = document.getElementById('pd-description');
    const detailsEl = document.getElementById('pd-detail-items');
    const galleryEl = document.getElementById('pd-gallery');

    if (titleEl) titleEl.innerText = t(project.title) || '';
    if (metaEl) {
        const year = project.yearLabel || '';
        const cat = t(project.categoryText) || '';
        metaEl.innerText = [year, cat].filter(Boolean).join(' | ');
    }
    if (descriptionEl) descriptionEl.innerText = t(project.description) || '';
    setBackgroundImage(mainImgEl, project.imageUrl);
    renderProjectDetailItems(detailsEl, project.detailItems);
    renderProjectGallery(galleryEl, project.galleryItems);
}

function openProjectDetail(title, year, category, projectId) {
    const overlay = document.getElementById('project-detail-overlay');
    const titleEl = document.getElementById('pd-title');
    const metaEl = document.getElementById('pd-meta');
    const mainImgEl = document.getElementById('pd-main-img');
    const galImages = document.querySelectorAll('.pd-gallery-img');
    const dynamicProject = getRazanProjectDetail(projectId);

    if (dynamicProject) {
        renderDynamicProjectDetail(dynamicProject);
        if (overlay) {
            overlay.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
            overlay.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
        }
        return;
    }

    const lang = document.documentElement.lang || 'en';
    const t = (text) => (translations[lang] && translations[lang][text]) ? translations[lang][text] : text;

    if (titleEl) titleEl.innerText = t(title);
    if (metaEl) metaEl.innerText = `${year} | ${t(category)}`;

    const imgs = projectImages[projectId];
    if (imgs) {
        if (mainImgEl) mainImgEl.style.setProperty('background-image', `url('../assets/pics/Buildings/${imgs[0]}')`, 'important');

        galImages.forEach((el, index) => {
            if (imgs[index + 1]) {
                el.style.setProperty('background-image', `url('../assets/pics/Buildings/${imgs[index + 1]}')`, 'important');
            }
        });
    }

    if (overlay) {
        overlay.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
        overlay.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
    }
}

function closeProjectDetail() {
    const overlay = document.getElementById('project-detail-overlay');
    if (overlay) {
        overlay.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
        overlay.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
    }
}

function initHomeMatrix() {
    const grid = document.getElementById('home-matrix-grid');
    if (!grid) return;

    const matrixSize = 10;
    const totalCells = matrixSize * matrixSize;
    const fallbackImages = [
        { title: 'Sepidar Cultural Center', imageUrl: 'cdn/Files/Razan/Projects/project-seed-01.jpg', projectId: 25 },
        { title: 'Central Courtyard House', imageUrl: 'cdn/Files/Razan/Projects/project-seed-02.jpg', projectId: 26 },
        { title: 'Noor Healthcare Center', imageUrl: 'cdn/Files/Razan/Projects/project-seed-03.jpg', projectId: 27 },
        { title: 'Lotus Workplace Tower', imageUrl: 'cdn/Files/Razan/Projects/project-seed-04.jpg', projectId: 28 },
        { title: 'Baran Urban Campus', imageUrl: 'cdn/Files/Razan/Projects/project-seed-05.jpg', projectId: 29 },
        { title: 'Avin Retail Complex', imageUrl: 'cdn/Files/Razan/Projects/project-seed-06.jpg', projectId: 30 }
    ];
    const dynamicItems = Array.isArray(window.razanHomeMatrixItems)
        ? window.razanHomeMatrixItems.filter(item => item && item.imageUrl)
        : [];
    const sourceItems = dynamicItems.length > 0 ? dynamicItems : fallbackImages;
    const getMatrixItem = (index) => sourceItems[index % sourceItems.length];
    const normalizeMatrixData = (data) => {
        const imageUrl = data && data.imageUrl ? data.imageUrl : '';
        const projectId = data && data.projectId ? String(data.projectId) : '';
        const title = data && data.title ? data.title : '';

        return {
            imageUrl,
            projectId,
            title,
            matrixKey: projectId ? `project-${projectId}` : `image-${imageUrl}`
        };
    };

    const updateMatrixTitle = (element, title) => {
        let titleElement = element.querySelector('.matrix-title');

        if (!title) {
            if (titleElement) {
                titleElement.remove();
            }
            return;
        }

        if (!titleElement) {
            titleElement = document.createElement('span');
            titleElement.className = 'matrix-title';
            element.appendChild(titleElement);
        }

        titleElement.textContent = title;
    };

    const applyMatrixData = (element, data) => {
        setBackgroundImage(element, data.imageUrl);
        const title = t(data.title) || '';
        element.dataset.matrixKey = data.matrixKey;
        element.dataset.projectId = data.projectId || '';
        element.setAttribute('aria-label', title);
        element.setAttribute('role', 'img');
        if (title) {
            element.title = title;
        } else {
            element.removeAttribute('title');
        }
        updateMatrixTitle(element, title);
    };

    const fragment = document.createDocumentFragment();
    const matrixItems = [];

    for (let i = 0; i < totalCells; i++) {
        const item = document.createElement('div');
        const matrixData = normalizeMatrixData(getMatrixItem(i));

        const row = Math.floor(i / matrixSize);
        const col = i % matrixSize;
        const distance = row + col;
        const waveGroup = (distance % 5) + 1;

        item.className = `matrix-item matrix-wave-${waveGroup} w-full h-full bg-cover bg-center`;
        item.dataset.matrixIndex = i.toString();
        item.dataset.matrixRow = row.toString();
        item.dataset.matrixCol = col.toString();
        item.addEventListener('click', () => {
            const currentItem = matrixItems[Number(item.dataset.matrixIndex)];
            if (currentItem && currentItem.projectId) {
                openProjectDetailById(Number(currentItem.projectId));
            }
        });
        matrixItems[i] = matrixData;
        applyMatrixData(item, matrixData);

        fragment.appendChild(item);
    }

    grid.replaceChildren(fragment);
    grid.classList.add('matrix-live-grid');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cells = Array.from(grid.children);
    let matrixTimer = 0;
    let matrixCompleteTimer = 0;
    const conveyorDuration = 940;
    let lastLaneKey = '';
    let activeCells = [];
    let activeClone = null;

    const resetMatrixMotionStyles = (cell) => {
        cell.classList.remove('matrix-conveyor-cell');
        cell.style.removeProperty('--matrix-x');
        cell.style.removeProperty('--matrix-y');
        cell.style.removeProperty('--matrix-z');
    };

    const setMatrixClipBounds = () => {
        if (!cells.length) return false;

        const gridRect = grid.getBoundingClientRect();
        let minLeft = Infinity;
        let maxRight = -Infinity;
        let minTop = Infinity;
        let maxBottom = -Infinity;

        for (let i = 0; i < cells.length; i++) {
            const r = cells[i].getBoundingClientRect();
            if (r.left < minLeft) minLeft = r.left;
            if (r.right > maxRight) maxRight = r.right;
            if (r.top < minTop) minTop = r.top;
            if (r.bottom > maxBottom) maxBottom = r.bottom;
        }

        const clipTop = Math.max(0, minTop - gridRect.top);
        const clipRight = Math.max(0, gridRect.right - maxRight);
        const clipBottom = Math.max(0, gridRect.bottom - maxBottom);
        const clipLeft = Math.max(0, minLeft - gridRect.left);

        grid.style.setProperty('--matrix-clip-top', `${clipTop.toFixed(2)}px`);
        grid.style.setProperty('--matrix-clip-right', `${clipRight.toFixed(2)}px`);
        grid.style.setProperty('--matrix-clip-bottom', `${clipBottom.toFixed(2)}px`);
        grid.style.setProperty('--matrix-clip-left', `${clipLeft.toFixed(2)}px`);

        return true;
    };

    const clearMatrixClipBounds = () => {
        grid.style.removeProperty('--matrix-clip-top');
        grid.style.removeProperty('--matrix-clip-right');
        grid.style.removeProperty('--matrix-clip-bottom');
        grid.style.removeProperty('--matrix-clip-left');
    };

    const clearConveyorMotion = () => {
        window.clearTimeout(matrixCompleteTimer);

        if (activeCells.length > 0) {
            activeCells.forEach(cell => cell.classList.add('matrix-conveyor-snap'));
            activeCells.forEach(resetMatrixMotionStyles);
            void grid.offsetHeight;
            activeCells.forEach(cell => cell.classList.remove('matrix-conveyor-snap'));
        }

        if (activeClone) {
            activeClone.remove();
            activeClone = null;
        }

        grid.classList.remove('matrix-conveyor-active');
        clearMatrixClipBounds();
        activeCells = [];
    };

    const canAnimateMatrix = () => {
        const homePanel = document.getElementById('sec-home');
        const tabIsVisible = typeof isTabVisible === 'undefined' ? true : isTabVisible;

        return tabIsVisible
            && homePanel
            && homePanel.classList.contains('opacity-100')
            && document.body.getAttribute('data-phase') === 'idle'
            && !document.hidden;
    };

    const getConveyorLane = () => {
        const axis = Math.random() > 0.5 ? 'row' : 'col';
        let index = Math.floor(Math.random() * matrixSize);
        let laneKey = `${axis}-${index}`;

        if (laneKey === lastLaneKey) {
            index = (index + 3 + Math.floor(Math.random() * 4)) % matrixSize;
            laneKey = `${axis}-${index}`;
        }

        lastLaneKey = laneKey;

        return {
            axis,
            index,
            direction: Math.random() > 0.5 ? 1 : -1
        };
    };

    const getLaneCells = (lane) => {
        const isRow = lane.axis === 'row';
        const laneKey = isRow ? 'matrixRow' : 'matrixCol';
        const sortKey = isRow ? 'matrixCol' : 'matrixRow';

        return cells
            .filter(cell => Number(cell.dataset[laneKey]) === lane.index)
            .sort((first, second) => Number(first.dataset[sortKey]) - Number(second.dataset[sortKey]));
    };

    const getLaneStep = (lane, laneCells) => {
        if (laneCells.length < 2) return 0;

        const firstRect = laneCells[0].getBoundingClientRect();
        const secondRect = laneCells[1].getBoundingClientRect();
        const step = lane.axis === 'row'
            ? secondRect.left - firstRect.left
            : secondRect.top - firstRect.top;

        return Math.abs(step);
    };

    const createWrapClone = (lane, laneCells, step) => {
        const isForward = lane.direction === 1;
        const sourceCell = isForward ? laneCells[laneCells.length - 1] : laneCells[0];
        const targetCell = isForward ? laneCells[0] : laneCells[laneCells.length - 1];
        const gridRect = grid.getBoundingClientRect();
        const targetRect = targetCell.getBoundingClientRect();
        const clone = sourceCell.cloneNode(true);

        let left = targetRect.left - gridRect.left;
        let top = targetRect.top - gridRect.top;

        if (lane.axis === 'row') {
            left += isForward ? -step : step;
        } else {
            top += isForward ? -step : step;
        }

        clone.classList.add('matrix-conveyor-clone', 'matrix-conveyor-cell');
        clone.classList.remove('matrix-conveyor-snap');
        clone.style.left = `${left}px`;
        clone.style.top = `${top}px`;
        clone.style.width = `${targetRect.width}px`;
        clone.style.height = `${targetRect.height}px`;
        clone.style.setProperty('--matrix-z', '40');

        return clone;
    };

    const rotateLaneData = (laneCells, direction) => {
        const oldData = laneCells.map(cell => matrixItems[Number(cell.dataset.matrixIndex)]);
        const rotatedData = direction === 1
            ? [oldData[oldData.length - 1], ...oldData.slice(0, -1)]
            : [...oldData.slice(1), oldData[0]];

        laneCells.forEach((cell, index) => {
            const matrixIndex = Number(cell.dataset.matrixIndex);
            matrixItems[matrixIndex] = rotatedData[index];
            applyMatrixData(cell, rotatedData[index]);
        });
    };

    const completeConveyorMotion = (laneCells, direction) => {
        laneCells.forEach(cell => cell.classList.add('matrix-conveyor-snap'));
        rotateLaneData(laneCells, direction);
        laneCells.forEach(resetMatrixMotionStyles);

        if (activeClone) {
            activeClone.remove();
            activeClone = null;
        }

        grid.classList.remove('matrix-conveyor-active');
        clearMatrixClipBounds();
        void grid.offsetHeight;
        laneCells.forEach(cell => cell.classList.remove('matrix-conveyor-snap'));
        activeCells = [];
        scheduleNext();
    };

    const applyConveyorMotion = (lane) => {
        const laneCells = getLaneCells(lane);

        if (laneCells.length < 2) return false;

        const step = getLaneStep(lane, laneCells);
        if (step <= 0) return false;

        clearConveyorMotion();
        if (!setMatrixClipBounds()) return false;

        activeCells = laneCells;
        activeClone = createWrapClone(lane, laneCells, step);
        grid.classList.add('matrix-conveyor-active');

        laneCells.forEach((cell, order) => {
            cell.classList.add('matrix-conveyor-cell');
            cell.style.setProperty('--matrix-z', `${20 + order}`);
        });

        grid.appendChild(activeClone);
        void grid.offsetHeight;

        const shiftProperty = lane.axis === 'row' ? '--matrix-x' : '--matrix-y';
        const shift = `${lane.direction * step}px`;
        laneCells.forEach(cell => cell.style.setProperty(shiftProperty, shift));
        activeClone.style.setProperty(shiftProperty, shift);

        matrixCompleteTimer = window.setTimeout(() => {
            completeConveyorMotion(laneCells, lane.direction);
        }, conveyorDuration);

        return true;
    };

    const scheduleNext = () => {
        window.clearTimeout(matrixTimer);
        if (prefersReducedMotion || document.hidden) return;

        const delay = 1500 + Math.floor(Math.random() * 1700);
        matrixTimer = window.setTimeout(animateNext, delay);
    };

    const animateNext = () => {
        if (!canAnimateMatrix()) {
            clearConveyorMotion();
            scheduleNext();
            return;
        }

        const didAnimate = applyConveyorMotion(getConveyorLane());
        if (!didAnimate) {
            scheduleNext();
        }
    };

    if (!prefersReducedMotion && cells.length > 0) {
        scheduleNext();
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                window.clearTimeout(matrixTimer);
                clearConveyorMotion();
            } else {
                scheduleNext();
            }
        });
    }
}

function toggleLanguage(lang) {
    const safeLang = lang === 'fa' ? 'fa' : 'en';
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('lang') !== safeLang) {
        currentUrl.searchParams.set('lang', safeLang);
        window.location.assign(currentUrl.toString());
        return;
    }

    applyLanguageChrome(safeLang, true);

    clearIntroTimers();
    introStarted = false;
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        overlay.classList.remove('intro-phase-1', 'intro-phase-2', 'intro-phase-3', 'intro-fade-out', 'intro-hidden');
    }
    
    document.body.classList.remove('content-visible');
    document.body.setAttribute('data-phase', 'intro');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            measureIntroTarget();
            startIntroSequence();
        });
    });
}
