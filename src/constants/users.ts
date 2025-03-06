// 사용자 ID와 이름을 함께 매핑한 객체
export const USER = {
  HEIDI: {
    id: '25bd10f3-5d46-40a2-9351-88e66072fddb',
    name: 'Heidi'
  },
  JAEYOUNG: {
    id: '3a4959d1-7793-47d1-ab3c-463946ca12a4',
    name: 'Jaeyoung kim'
  },
  SOL: {
    id: '400d8242-b598-49aa-85de-3cd0cf2a6e1b',
    name: 'Sol Han'
  },
  NICHOLAS: {
    id: '94e2a2f7-fc78-43fd-a860-a5f8390cda9a',
    name: 'Nicholas'
  },
  SEOYOON: {
    id: 'ccf6ddde-3a05-4d72-bb2d-076fc60e0099',
    name: 'Seoyoon Kim'
  },
  IRENE: {
    id: 'f97e67c1-5231-4775-8a08-2ff10f0ff738',
    name: 'Irene Kim'
  },
  SAKURA: {
    id: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b',
    name: 'Sakura Takubo'
  },
  AYOUNG: {
    id: '6480f13a-e189-496d-9bdc-932d40e7e5ac',
    name: 'AYOUNG HEON'
  }

} as const;

// ID만 포함하는 객체
export const USER_ID = {
  HEIDI: '25bd10f3-5d46-40a2-9351-88e66072fddb',
  JAEYOUNG: '3a4959d1-7793-47d1-ab3c-463946ca12a4',
  SOL: '400d8242-b598-49aa-85de-3cd0cf2a6e1b',
  NICHOLAS: '94e2a2f7-fc78-43fd-a860-a5f8390cda9a',
  SEOYOON: 'ccf6ddde-3a05-4d72-bb2d-076fc60e0099',
  IRENE: 'f97e67c1-5231-4775-8a08-2ff10f0ff738',
  SAKURA: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b',
  AYOUNG: '6480f13a-e189-496d-9bdc-932d40e7e5ac'
} as const;

// 이름만 포함하는 객체
export const USER_NAME = {
  HEIDI: 'Heidi',
  JAEYOUNG: 'Jaeyoung kim',
  SOL: 'Sol Han',
  NICHOLAS: 'Nicholas',
  SEOYOON: 'Seoyoon Kim',
  IRENE: 'Irene Kim',
  SAKURA: 'Sakura Takubo',
  AYOUNG: 'AYOUNG HEON'
} as const; 