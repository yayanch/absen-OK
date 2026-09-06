export interface LoginBgImagePreset {
  id: string;
  name: string;
  category: 'sekolah' | 'modern' | 'minimalis' | 'kampus';
  thumbnailUrl: string;
  imageUrl: string;
  desc: string;
}

export interface LoginBgGradientPreset {
  id: string;
  name: string;
  gradient: string;
  textColor: string;
  desc: string;
}

export interface LoginBgPatternPreset {
  id: string;
  name: string;
  svgPattern: string;
  bgBase: string;
  desc: string;
}

// Preset Wallpaper Gambar Sekolah & Kampus Modern (High Resolution 4K / QHD WebP)
export const LOGIN_IMAGE_PRESETS: LoginBgImagePreset[] = [
  {
    id: 'school_campus_modern',
    name: 'Gedung Sekolah Modern',
    category: 'sekolah',
    thumbnailUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Gedung sekolah megah berarsitektur modern dengan suasana asri.',
  },
  {
    id: 'school_library_hall',
    name: 'Perpustakaan & Ruang Belajar',
    category: 'kampus',
    thumbnailUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Suasana perpustakaan akademis yang tenang, rapi, dan berwibawa.',
  },
  {
    id: 'computer_lab_tech',
    name: 'Laboratorium Komputer & IT',
    category: 'modern',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Ruang teknologi kejuruan dengan fasilitas komputasi modern.',
  },
  {
    id: 'classroom_interactive',
    name: 'Ruang Kelas Kolaboratif',
    category: 'sekolah',
    thumbnailUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Interior kelas modern yang bersih dan bernuansa edukatif.',
  },
  {
    id: 'geometric_architecture_blue',
    name: 'Geometris Arsitektur Biru',
    category: 'modern',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Struktur arsitektur minimalis modern dengan pencahayaan seimbang.',
  },
  {
    id: 'grad_students_campus',
    name: 'Halaman Kampus Hijau',
    category: 'kampus',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Lingkungan kampus terbuka dengan pepohonan rimbun dan sejuk.',
  },
  {
    id: 'abstract_digital_blue',
    name: 'Teknologi Abstrak Biru',
    category: 'minimalis',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Visual data digital modern dengan aksen gradasi biru elegan.',
  },
  {
    id: 'slate_minimal_dark',
    name: 'Minimalis Elegan Slate',
    category: 'minimalis',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=75',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&auto=format&fit=crop&q=90&fm=webp',
    desc: 'Nuansa fluid 3D abstrak gelap yang tenang dan kontras tinggi.',
  },
];

// Preset Gradasi Warna Login
export const LOGIN_GRADIENT_PRESETS: LoginBgGradientPreset[] = [
  {
    id: 'royal_blue_official',
    name: 'Biru Royal Resmi (Default SMKN 6)',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #0f172a 100%)',
    textColor: '#ffffff',
    desc: 'Gradasi resmi biru kejuruan SMKN 6 Garut.',
  },
  {
    id: 'ocean_sky_light',
    name: 'Biru Langit & Samudra (Fresh Ocean)',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
    textColor: '#ffffff',
    desc: 'Warna biru cerah yang memberikan kesan ramah dan segar.',
  },
  {
    id: 'midnight_navy_deep',
    name: 'Midnight Navy (Malam Pekat)',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
    textColor: '#ffffff',
    desc: 'Sangat elegan, minim distraksi, dan fokus optimal pada kartu login.',
  },
  {
    id: 'emerald_academic',
    name: 'Emerald Education (Hijau Zamrud)',
    gradient: 'linear-gradient(135deg, #065f46 0%, #064e3b 50%, #022c22 100%)',
    textColor: '#ffffff',
    desc: 'Nuansa hijau alami, adem, dan melambangkan pertumbuhan siswa.',
  },
  {
    id: 'indigo_cyber',
    name: 'Cyber Indigo (Teknologi Digital)',
    gradient: 'linear-gradient(135deg, #4338ca 0%, #312e81 50%, #1e1b4b 100%)',
    textColor: '#ffffff',
    desc: 'Nuansa digital futuristik dengan saturasi indigo pekat.',
  },
  {
    id: 'slate_monochrome',
    name: 'Slate Charcoal (Monokrom Modern)',
    gradient: 'linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)',
    textColor: '#ffffff',
    desc: 'Abu-abu profesional berkelas dengan kontras kartu tinggi.',
  },
  {
    id: 'aurora_borealis',
    name: 'Aurora Deep Sky (Biru ke Ungu)',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #4c1d95 60%, #0f172a 100%)',
    textColor: '#ffffff',
    desc: 'Gradasi dinamis beraksen aurora biru royal dan ungu gelap.',
  },
  {
    id: 'soft_warm_light',
    name: 'Soft Light Mist (Terang Bersih)',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #e0e7ff 100%)',
    textColor: '#0f172a',
    desc: 'Gradasi lembut terang untuk suasana bersih dan lapang.',
  },
];

// Preset Pola Geometris (SVG Pattern)
export const LOGIN_PATTERN_PRESETS: LoginBgPatternPreset[] = [
  {
    id: 'blueprint_grid',
    name: 'Blueprint Grid Matrix',
    bgBase: '#1e3a8a',
    svgPattern: `radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
    desc: 'Pola titik matriks berjarak teratur dengan dasar biru royal.',
  },
  {
    id: 'tech_squares',
    name: 'Square Blueprint Garis',
    bgBase: '#0f172a',
    svgPattern: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
    desc: 'Pola kotak bergaris presisi gaya cetak biru teknik.',
  },
  {
    id: 'dots_dense',
    name: 'Modern Dot Array',
    bgBase: '#1e293b',
    svgPattern: `radial-gradient(rgba(59, 130, 246, 0.35) 1.5px, transparent 1.5px)`,
    desc: 'Pola dot array cyan dan biru bercahaya modern.',
  },
  {
    id: 'diagonal_stripes',
    name: 'Garis Strip Diagonal Halus',
    bgBase: '#172554',
    svgPattern: `repeating-linear-gradient(45deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 10px, transparent 10px, transparent 20px)`,
    desc: 'Pola garis diagonal dinamis yang elegan.',
  },
];
