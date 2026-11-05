import type {
  Advisor,
  ApprovalPolicy,
  CardDesign,
  CardKind,
  CategoryId,
  Company,
  LimitPeriod,
  MerchantGroup,
  Role,
} from '@post-oak/contracts';

/**
 * The fictional client used across the demo: a Houston freight company, the kind of
 * middle-market operator Post Oak Group advises. Every name here is sample data.
 */
export const COMPANY: Company = {
  name: 'Brazos Gulf Logistics',
  legalName: 'Brazos Gulf Logistics, Inc.',
  industry: 'Freight & logistics',
  location: 'Houston, Texas',
  initials: 'BG',
};

export const ADVISOR: Advisor = {
  name: 'Catherine Hale',
  initials: 'CH',
  title: 'Managing Director',
  practice: 'Transportation & Logistics',
};

export const TEAM: {
  id: string;
  name: string;
  title: string;
  role: Role;
  status?: 'invited';
}[] = [
  { id: 'usr_elena', name: 'Elena Vasquez', title: 'Chief Executive Officer', role: 'owner' },
  { id: 'usr_marcus', name: 'Marcus Reed', title: 'Chief Financial Officer', role: 'admin' },
  { id: 'usr_priya', name: 'Priya Nair', title: 'Controller', role: 'bookkeeper' },
  { id: 'usr_jordan', name: 'Jordan Tate', title: 'Director of Operations', role: 'employee' },
  { id: 'usr_hannah', name: 'Hannah Cole', title: 'Fleet Manager', role: 'employee' },
  {
    id: 'usr_daniel',
    name: 'Daniel Okafor',
    title: 'Accounts Payable Specialist',
    role: 'bookkeeper',
    status: 'invited',
  },
];

export const ACCOUNTS = [
  {
    id: 'acc_operating',
    name: 'Operating',
    kind: 'operating',
    purpose: 'Customer receipts and day-to-day vendor payments',
    last4: '4821',
    targetBalance: 486_214_730,
    apyBps: null,
  },
  {
    id: 'acc_payroll',
    name: 'Payroll',
    kind: 'payroll',
    purpose: 'Funded ahead of each biweekly payroll run',
    last4: '7703',
    targetBalance: 61_238_415,
    apyBps: null,
  },
  {
    id: 'acc_tax',
    name: 'Tax Reserve',
    kind: 'tax',
    purpose: 'Set aside for quarterly federal and state filings',
    last4: '3310',
    targetBalance: 74_016_288,
    apyBps: 215,
  },
  {
    id: 'acc_reserve',
    name: 'Treasury Reserve',
    kind: 'reserve',
    purpose: 'Excess liquidity earning yield',
    last4: '9054',
    targetBalance: 219_822_119,
    apyBps: 412,
  },
] as const;

export const ROUTING_NUMBER = '113000023';

export const CUSTOMERS = [
  {
    name: 'Sabine Petrochemical Partners',
    weight: 0.235,
    payments: 4,
    email: 'ap@sabinepetro.example',
  },
  {
    name: 'Galveston Bay Terminals',
    weight: 0.14,
    payments: 4,
    email: 'payables@gbterminals.example',
  },
  {
    name: 'Lone Star Cold Chain',
    weight: 0.11,
    payments: 3,
    email: 'finance@lonestarcold.example',
  },
  {
    name: 'Permian Basin Supply Co.',
    weight: 0.095,
    payments: 3,
    email: 'ap@permiansupply.example',
  },
  {
    name: 'Trinity Building Products',
    weight: 0.085,
    payments: 3,
    email: 'accounts@trinitybp.example',
  },
  { name: 'Gulf Coast Agri-Foods', weight: 0.075, payments: 3, email: 'ap@gulfagri.example' },
  {
    name: 'Bayport Chemical Distribution',
    weight: 0.07,
    payments: 3,
    email: 'finance@bayportchem.example',
  },
  { name: 'Red River Steel', weight: 0.06, payments: 2, email: 'ap@redriversteel.example' },
  {
    name: 'Rio Grande Produce',
    weight: 0.05,
    payments: 2,
    email: 'billing@riograndeproduce.example',
  },
  { name: 'Cypress Medical Logistics', weight: 0.04, payments: 2, email: 'ap@cypressmed.example' },
  { name: 'Hill Country Beverages', weight: 0.04, payments: 2, email: 'finance@hcbev.example' },
] as const;

export const CARRIERS = [
  'Three Rivers Trucking',
  'Longhorn Drayage',
  'Coastal Bend Carriers',
  'Ozark Flatbed Co.',
  'Piney Woods Freight',
  'Alamo Reefer Lines',
  'Sam Houston Haulers',
  'Big Thicket Transport',
] as const;

export interface VendorSeed {
  name: string;
  category: CategoryId;
  bank: string;
  rail: 'ach' | 'wire';
  type: 'vendor' | 'tax_authority' | 'contractor';
}

export const VENDORS: VendorSeed[] = [
  {
    name: 'Meridian Fleet Leasing',
    category: 'equipment',
    bank: 'Frost Bank',
    rail: 'wire',
    type: 'vendor',
  },
  {
    name: 'Gulf States Mutual',
    category: 'insurance',
    bank: 'Comerica Bank',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Westchase Industrial Partners',
    category: 'facilities',
    bank: 'Amegy Bank',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Bayport Logistics Park',
    category: 'facilities',
    bank: 'Amegy Bank',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Comdata Fleet Settlement',
    category: 'fuel',
    bank: 'Regions Bank',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Rush Truck Centers',
    category: 'maintenance',
    bank: 'Frost Bank',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Cummins Southern Plains',
    category: 'maintenance',
    bank: 'JPMorgan Chase',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Haynes & Cole LLP',
    category: 'professional',
    bank: 'Wells Fargo',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'Baker Ridge CPAs',
    category: 'professional',
    bank: 'Wells Fargo',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'CenterPoint Energy',
    category: 'utilities',
    bank: 'JPMorgan Chase',
    rail: 'ach',
    type: 'vendor',
  },
  {
    name: 'US Treasury EFTPS',
    category: 'taxes',
    bank: 'Federal Reserve',
    rail: 'ach',
    type: 'tax_authority',
  },
  {
    name: 'Texas Comptroller',
    category: 'taxes',
    bank: 'Texas Treasury',
    rail: 'ach',
    type: 'tax_authority',
  },
];

export const RECURRING_SOFTWARE = [
  { name: 'Samsara', amount: [14_800, 15_400] },
  { name: 'McLeod Software', amount: [8_200, 8_600] },
  { name: 'Microsoft 365', amount: [3_100, 3_300] },
  { name: 'Salesforce', amount: [2_400, 2_500] },
  { name: 'NetSuite', amount: [4_900, 5_100] },
  { name: 'Zoom', amount: [410, 430] },
  { name: 'Slack', amount: [640, 700] },
] as const;

export const FUEL_MERCHANTS = [
  "Love's Travel Stops",
  'Pilot Flying J',
  "Buc-ee's",
  'Valero',
  'Shell',
] as const;
export const PARTS_MERCHANTS = [
  'NAPA Auto Parts',
  'Goodyear Commercial Tire',
  'FleetPride',
  'TA Truck Service',
] as const;
export const TRAVEL_MERCHANTS = ['United Airlines', 'Marriott Houston', 'Hertz', 'Uber'] as const;
export const MEAL_MERCHANTS = [
  'Whataburger',
  'Pappas Bros. Steakhouse',
  'Goode Company',
  'Torchy’s Tacos',
] as const;

export interface CardSeed {
  id: string;
  nickname: string;
  kind: CardKind;
  design: CardDesign;
  holderId: string;
  accountId: string;
  last4: string;
  limit: number;
  period: LimitPeriod;
  blockedMerchants: MerchantGroup[];
  frozen?: boolean;
}

export const CARDS: CardSeed[] = [
  {
    id: 'crd_executive',
    nickname: 'Executive',
    kind: 'physical',
    design: 'graphite',
    holderId: 'usr_elena',
    accountId: 'acc_operating',
    last4: '2204',
    limit: 5_000_000,
    period: 'monthly',
    blockedMerchants: ['cash'],
  },
  {
    id: 'crd_houston',
    nickname: 'Fleet Fuel, Houston Yard',
    kind: 'physical',
    design: 'oak',
    holderId: 'usr_hannah',
    accountId: 'acc_operating',
    last4: '7741',
    limit: 6_000_000,
    period: 'monthly',
    blockedMerchants: ['travel', 'dining', 'software', 'retail', 'cash'],
  },
  {
    id: 'crd_beaumont',
    nickname: 'Fleet Fuel, Beaumont Yard',
    kind: 'physical',
    design: 'oak',
    holderId: 'usr_hannah',
    accountId: 'acc_operating',
    last4: '3186',
    limit: 4_000_000,
    period: 'monthly',
    blockedMerchants: ['travel', 'dining', 'software', 'retail', 'cash'],
  },
  {
    id: 'crd_ops',
    nickname: 'Operations Travel',
    kind: 'physical',
    design: 'ivory',
    holderId: 'usr_jordan',
    accountId: 'acc_operating',
    last4: '5592',
    limit: 1_500_000,
    period: 'monthly',
    blockedMerchants: ['cash'],
  },
  {
    id: 'crd_software',
    nickname: 'Software & Subscriptions',
    kind: 'virtual',
    design: 'oak',
    holderId: 'usr_marcus',
    accountId: 'acc_operating',
    last4: '9013',
    limit: 4_500_000,
    period: 'monthly',
    blockedMerchants: ['fuel', 'fleet', 'cash'],
  },
  {
    id: 'crd_parts',
    nickname: 'Parts & Repairs',
    kind: 'virtual',
    design: 'graphite',
    holderId: 'usr_jordan',
    accountId: 'acc_operating',
    last4: '6420',
    limit: 3_000_000,
    period: 'monthly',
    blockedMerchants: ['travel', 'dining', 'cash'],
  },
  {
    id: 'crd_marketing',
    nickname: 'Marketing',
    kind: 'virtual',
    design: 'ivory',
    holderId: 'usr_priya',
    accountId: 'acc_operating',
    last4: '1178',
    limit: 1_200_000,
    period: 'monthly',
    blockedMerchants: ['fuel', 'fleet', 'cash'],
    frozen: true,
  },
];

export const POLICIES: ApprovalPolicy[] = [
  {
    id: 'pol_wire',
    name: 'Dual approval on large wires',
    description: 'Wires at or above the threshold need a second person before they leave.',
    rails: ['wire'],
    threshold: 2_500_000,
    onlyNewRecipients: false,
    approvalsRequired: 1,
    enabled: true,
  },
  {
    id: 'pol_ach',
    name: 'Dual approval on large ACH',
    description: 'ACH and instant payments at or above the threshold need a second person.',
    rails: ['ach', 'rtp'],
    threshold: 5_000_000,
    onlyNewRecipients: false,
    approvalsRequired: 1,
    enabled: true,
  },
  {
    id: 'pol_new_recipient',
    name: 'New recipient review',
    description: 'The first payment to any new recipient is reviewed, whatever the amount.',
    rails: ['ach', 'wire', 'rtp'],
    threshold: 0,
    onlyNewRecipients: true,
    approvalsRequired: 1,
    enabled: true,
  },
];

/** Banks behind routing numbers, used by the recipient form's live lookup. */
export const KNOWN_BANKS: Record<string, string> = {
  '021000021': 'JPMorgan Chase',
  '026009593': 'Bank of America',
  '121000248': 'Wells Fargo',
  '114000093': 'Frost Bank',
  '113000023': 'Bank of America, Texas',
  '111000614': 'JPMorgan Chase, Texas',
  '062000019': 'Regions Bank',
};
