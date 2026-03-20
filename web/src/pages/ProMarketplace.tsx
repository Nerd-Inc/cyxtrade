import { useEffect, useState, useMemo, useRef, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useAdsStore, useWalletStore, type P2PAd } from '../store/pro'
import { DarkModeContext } from '../App'

// Crypto assets with icons, names, symbols, and colors
const CRYPTO_ASSETS = [
  { code: 'USDT', name: 'Tether', symbol: '₮', color: '#26A17B', icon: '₮' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', color: '#F7931A', icon: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', color: '#627EEA', icon: 'Ξ' },
  { code: 'BNB', name: 'BNB', symbol: 'BNB', color: '#F3BA2F', icon: 'B' },
  { code: 'USDC', name: 'USD Coin', symbol: '$', color: '#2775CA', icon: '$' },
  { code: 'SOL', name: 'Solana', symbol: '◎', color: '#9945FF', icon: '◎' },
  { code: 'XRP', name: 'Ripple', symbol: '✕', color: '#23292F', icon: '✕' },
  { code: 'ADA', name: 'Cardano', symbol: '₳', color: '#0033AD', icon: '₳' },
  { code: 'DOGE', name: 'Dogecoin', symbol: 'Ð', color: '#C2A633', icon: 'Ð' },
  { code: 'DOT', name: 'Polkadot', symbol: '●', color: '#E6007A', icon: '●' },
  { code: 'MATIC', name: 'Polygon', symbol: 'M', color: '#8247E5', icon: 'M' },
  { code: 'LTC', name: 'Litecoin', symbol: 'Ł', color: '#345D9D', icon: 'Ł' },
  { code: 'AVAX', name: 'Avalanche', symbol: 'A', color: '#E84142', icon: 'A' },
  { code: 'TRX', name: 'TRON', symbol: 'T', color: '#FF0013', icon: 'T' },
  { code: 'LINK', name: 'Chainlink', symbol: '⬡', color: '#2A5ADA', icon: '⬡' },
  { code: 'ATOM', name: 'Cosmos', symbol: '⚛', color: '#2E3148', icon: '⚛' },
  { code: 'UNI', name: 'Uniswap', symbol: '🦄', color: '#FF007A', icon: 'U' },
  { code: 'XLM', name: 'Stellar', symbol: '*', color: '#14B6E7', icon: '*' },
  { code: 'NEAR', name: 'NEAR Protocol', symbol: 'N', color: '#00C08B', icon: 'N' },
  { code: 'TON', name: 'Toncoin', symbol: '◇', color: '#0098EA', icon: '◇' },
]

// Comprehensive currency list with symbols and names
const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', color: '#2E7D32' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', color: '#D32F2F' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'Lek', color: '#C62828' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', color: '#F9A825' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', color: '#EF6C00' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', color: '#1565C0' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', color: '#FFB300' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', color: '#E65100' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Mark', symbol: 'KM', color: '#C62828' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', color: '#2E7D32' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', color: '#388E3C' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', color: '#C62828' },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu', color: '#D32F2F' },
  { code: 'BND', name: 'Brunei Dollar', symbol: '$', color: '#FBC02D' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.', color: '#388E3C' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', color: '#2E7D32' },
  { code: 'BWP', name: 'Botswanan Pula', symbol: 'P', color: '#1976D2' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', color: '#C62828' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', color: '#D32F2F' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', color: '#1565C0' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', color: '#D32F2F' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', color: '#1565C0' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', color: '#C62828' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', color: '#FBC02D' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', color: '#1565C0' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', color: '#1565C0' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', color: '#C62828' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', color: '#1565C0' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', color: '#2E7D32' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', color: '#C62828' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', color: '#2E7D32' },
  { code: 'EUR', name: 'Euro', symbol: '€', color: '#1565C0' },
  { code: 'GBP', name: 'British Pound', symbol: '£', color: '#7B1FA2' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', color: '#C62828' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', color: '#FBC02D' },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', color: '#2E7D32' },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'FG', color: '#C62828' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', color: '#1976D2' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$', color: '#C62828' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', color: '#1565C0' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', color: '#1565C0' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', color: '#388E3C' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', color: '#C62828' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', color: '#1565C0' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', color: '#FF6F00' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', color: '#C62828' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', color: '#2E7D32' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', color: '#1565C0' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', color: '#2E7D32' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', color: '#2E7D32' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', color: '#C62828' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', color: '#2E7D32' },
  { code: 'KGS', name: 'Kyrgystani Som', symbol: 'лв', color: '#C62828' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', color: '#1565C0' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', color: '#1565C0' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', color: '#2E7D32' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', color: '#1976D2' },
  { code: 'LAK', name: 'Laotian Kip', symbol: '₭', color: '#C62828' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', color: '#C62828' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', color: '#FF6F00' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', color: '#C62828' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', color: '#1565C0' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', color: '#2E7D32' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден', color: '#C62828' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', color: '#FBC02D' },
  { code: 'MNT', name: 'Mongolian Tugrik', symbol: '₮', color: '#1565C0' },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', color: '#2E7D32' },
  { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM', color: '#2E7D32' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', color: '#C62828' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK', color: '#C62828' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', color: '#2E7D32' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', color: '#1565C0' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', color: '#2E7D32' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: '$', color: '#1565C0' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', color: '#2E7D32' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', color: '#1565C0' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', color: '#C62828' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', color: '#1565C0' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', color: '#1565C0' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', color: '#C62828' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', color: '#1565C0' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', color: '#C62828' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', color: '#1565C0' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', color: '#2E7D32' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', color: '#C62828' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲', color: '#C62828' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', color: '#7B1FA2' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', color: '#1565C0' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин.', color: '#C62828' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', color: '#1565C0' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw', color: '#1565C0' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', color: '#2E7D32' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.', color: '#C62828' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', color: '#1565C0' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$', color: '#C62828' },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', color: '#2E7D32' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'S', color: '#1976D2' },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£', color: '#C62828' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', color: '#1565C0' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'SM', color: '#C62828' },
  { code: 'TMT', name: 'Turkmenistani Manat', symbol: 'T', color: '#2E7D32' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', color: '#C62828' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', color: '#C62828' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', color: '#C62828' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', color: '#2E7D32' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', color: '#1565C0' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', color: '#FBC02D' },
  { code: 'USD', name: 'US Dollar', symbol: '$', color: '#2E7D32' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', color: '#1565C0' },
  { code: 'UZS', name: 'Uzbekistan Som', symbol: 'лв', color: '#1976D2' },
  { code: 'VES', name: 'Venezuelan Bolívar', symbol: 'Bs', color: '#FBC02D' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', color: '#C62828' },
  { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'FCFA', color: '#2E7D32' },
  { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'CFA', color: '#2E7D32' },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', color: '#C62828' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', color: '#2E7D32' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', color: '#2E7D32' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: '$', color: '#FBC02D' },
]

// Payment methods by currency/region
const PAYMENT_METHODS_BY_CURRENCY: Record<string, string[]> = {
  // African currencies
  XAF: ['MTN Mobile Money', 'Orange Money - OM', 'MoMo', 'Ecobank', 'UBA Cameroun', 'Afriland First Bank', 'Bank Transfer', 'Moov Money', 'Airtel Money'],
  XOF: ['Orange Money', 'MTN Mobile Money', 'Wave', 'Moov Money', 'Ecobank', 'UBA', 'Bank Transfer', 'Free Money'],
  NGN: ['Bank Transfer', 'Opay', 'Palmpay', 'Kuda', 'GTBank', 'Access Bank', 'First Bank', 'Zenith Bank', 'UBA'],
  KES: ['M-Pesa', 'Airtel Money', 'Bank Transfer', 'Equity Bank', 'KCB', 'Co-operative Bank'],
  GHS: ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money', 'Bank Transfer', 'Ecobank', 'GCB Bank'],
  TZS: ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank Transfer', 'CRDB Bank', 'NMB Bank'],
  UGX: ['MTN Mobile Money', 'Airtel Money', 'Bank Transfer', 'Stanbic Bank', 'Centenary Bank'],
  ZAR: ['Bank Transfer', 'FNB', 'Standard Bank', 'Nedbank', 'Capitec', 'Absa'],
  ZMW: ['MTN Mobile Money', 'Airtel Money', 'Bank Transfer', 'Zanaco', 'Stanbic Bank'],
  RWF: ['MTN Mobile Money', 'Airtel Money', 'Bank Transfer', 'Bank of Kigali', 'Equity Bank'],

  // Middle East
  AED: ['Bank Transfer', 'ADCB', 'Emirates NBD', 'FAB', 'Mashreq', 'ENBD Pay', 'Apple Pay'],
  SAR: ['Bank Transfer', 'Al Rajhi Bank', 'SNB', 'Riyad Bank', 'STC Pay', 'Apple Pay'],
  QAR: ['Bank Transfer', 'QNB', 'Commercial Bank', 'Doha Bank', 'Ooredoo Money'],
  KWD: ['Bank Transfer', 'NBK', 'KFH', 'Boubyan Bank', 'K-Net'],
  BHD: ['Bank Transfer', 'BenefitPay', 'NBB', 'Ahli United Bank'],
  OMR: ['Bank Transfer', 'Bank Muscat', 'NBO', 'Sohar International'],
  JOD: ['Bank Transfer', 'Arab Bank', 'Housing Bank', 'eFAWATEERcom'],
  EGP: ['Bank Transfer', 'Vodafone Cash', 'InstaPay', 'CIB', 'NBE', 'Fawry'],

  // Asia
  CNY: ['Alipay', 'WeChat Pay', 'Bank Transfer', 'UnionPay'],
  INR: ['UPI', 'Paytm', 'PhonePe', 'Google Pay', 'IMPS', 'NEFT', 'Bank Transfer'],
  PKR: ['JazzCash', 'Easypaisa', 'Bank Transfer', 'HBL', 'UBL', 'Meezan Bank'],
  BDT: ['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Dutch-Bangla Bank'],
  IDR: ['Bank Transfer', 'OVO', 'GoPay', 'Dana', 'ShopeePay', 'BCA', 'Mandiri', 'BNI'],
  MYR: ['Bank Transfer', 'Touch n Go', 'Boost', 'GrabPay', 'Maybank', 'CIMB', 'Public Bank'],
  PHP: ['GCash', 'Maya', 'Bank Transfer', 'BDO', 'BPI', 'UnionBank', 'Coins.ph'],
  THB: ['PromptPay', 'Bank Transfer', 'TrueMoney', 'SCB', 'Bangkok Bank', 'Kasikorn'],
  VND: ['Bank Transfer', 'MoMo', 'ZaloPay', 'ViettelPay', 'Vietcombank', 'Techcombank'],
  SGD: ['Bank Transfer', 'PayNow', 'GrabPay', 'DBS', 'OCBC', 'UOB'],
  HKD: ['Bank Transfer', 'PayMe', 'FPS', 'HSBC', 'Bank of China', 'Hang Seng'],
  JPY: ['Bank Transfer', 'PayPay', 'Line Pay', 'Rakuten Pay'],
  KRW: ['Bank Transfer', 'Kakao Pay', 'Toss', 'Naver Pay'],
  TWD: ['Bank Transfer', 'Line Pay', 'JKoPay', 'Pi Wallet'],

  // Europe
  EUR: ['Bank Transfer', 'SEPA', 'Revolut', 'Wise', 'N26', 'PayPal'],
  GBP: ['Bank Transfer', 'Faster Payments', 'Revolut', 'Monzo', 'Wise', 'PayPal'],
  CHF: ['Bank Transfer', 'TWINT', 'PostFinance', 'UBS', 'Credit Suisse'],
  PLN: ['Bank Transfer', 'BLIK', 'Revolut', 'mBank', 'PKO'],
  CZK: ['Bank Transfer', 'Revolut', 'Air Bank', 'CSOB'],
  SEK: ['Bank Transfer', 'Swish', 'Revolut', 'Klarna'],
  NOK: ['Bank Transfer', 'Vipps', 'Revolut'],
  DKK: ['Bank Transfer', 'MobilePay', 'Revolut'],
  RUB: ['Bank Transfer', 'SBP', 'Sberbank', 'Tinkoff', 'Alfa-Bank'],
  UAH: ['Bank Transfer', 'Monobank', 'PrivatBank', 'A-Bank'],
  TRY: ['Bank Transfer', 'Papara', 'Ininal', 'Garanti', 'Akbank', 'İş Bankası'],

  // Americas
  USD: ['Bank Transfer', 'Zelle', 'Venmo', 'Cash App', 'PayPal', 'Wise', 'Apple Pay'],
  CAD: ['Bank Transfer', 'Interac e-Transfer', 'PayPal', 'Wise'],
  MXN: ['Bank Transfer', 'SPEI', 'Oxxo', 'Mercado Pago', 'BBVA', 'Banorte'],
  BRL: ['PIX', 'Bank Transfer', 'Nubank', 'Itaú', 'Bradesco', 'Mercado Pago'],
  ARS: ['Bank Transfer', 'Mercado Pago', 'Ualá', 'Brubank'],
  COP: ['Bank Transfer', 'Nequi', 'Daviplata', 'Bancolombia'],
  CLP: ['Bank Transfer', 'Mercado Pago', 'MACH', 'Banco Estado'],
  PEN: ['Bank Transfer', 'Yape', 'Plin', 'BCP', 'Interbank'],

  // Default fallback
  DEFAULT: ['Bank Transfer', 'Mobile Money', 'PayPal', 'Wise', 'Cash'],
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Payment method colors for visual indicators
const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'MTN Mobile Money': '#FFCC00',
  'Orange Money': '#FF6600',
  'Orange Money - OM': '#FF6600',
  'MoMo': '#D8127D',
  'M-Pesa': '#4CB848',
  'Airtel Money': '#ED1C24',
  'Wave': '#1DA1F2',
  'Ecobank': '#003D79',
  'UBA': '#D32F2F',
  'Bank Transfer': '#607D8B',
  'Alipay': '#1677FF',
  'WeChat Pay': '#07C160',
  'PayPal': '#003087',
  'Wise': '#9FE870',
  'Zelle': '#6D1ED4',
  'Venmo': '#3D95CE',
  'Cash App': '#00D632',
  'GCash': '#007DFE',
  'GrabPay': '#00B14F',
  'PIX': '#32BCAD',
  'UPI': '#5F259F',
  'Paytm': '#00BAF2',
  'DEFAULT': '#6B7280',
}

// Currency symbol prefixes
const CURRENCY_PREFIXES: Record<string, string> = {
  XAF: 'Fr',
  XOF: 'Fr',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  NGN: '₦',
  KES: 'KSh',
  GHS: '₵',
  ZAR: 'R',
  INR: '₹',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  BRL: 'R$',
  MXN: '$',
  PHP: '₱',
  THB: '฿',
  VND: '₫',
  IDR: 'Rp',
  MYR: 'RM',
  SGD: '$',
  TRY: '₺',
  RUB: '₽',
  PLN: 'zł',
}

export default function ProMarketplace() {
  const { dark, toggle: toggleTheme } = useContext(DarkModeContext)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { ads, isLoading, error, fetchAds } = useAdsStore()
  const { balances, fetchBalances } = useWalletStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [selectedAsset, setSelectedAsset] = useState('USDT')
  const [selectedFiat, setSelectedFiat] = useState('USD')
  const [selectedPayment, setSelectedPayment] = useState('')

  // Currency modal state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [currencySearch, setCurrencySearch] = useState('')
  const [recentCurrencies] = useState(['XAF', 'TZS', 'NGN'])
  const listRef = useRef<HTMLDivElement>(null)

  // Crypto modal state
  const [showCryptoModal, setShowCryptoModal] = useState(false)
  const [cryptoSearch, setCryptoSearch] = useState('')
  const [recentCryptos] = useState(['USDT', 'BTC', 'ETH'])

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentSearch, setPaymentSearch] = useState('')

  // Expanded ad state (for buy/sell form)
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null)
  const [orderAmount, setOrderAmount] = useState('')
  const [autoSubscribe, setAutoSubscribe] = useState(false)
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])

  // Amount filter
  const [showAmountModal, setShowAmountModal] = useState(false)
  const [amountFilter, setAmountFilter] = useState('')

  // Express mode state
  const [expressStep, setExpressStep] = useState<1 | 2 | 3>(1)
  const [expressMode, setExpressMode] = useState<'buy' | 'sell'>('buy')
  const [expressPayAmount, setExpressPayAmount] = useState('')
  const [expressReceiveAmount, setExpressReceiveAmount] = useState('')
  const [selectedExpressPayment, setSelectedExpressPayment] = useState('')
  const [selectedExpressAd, setSelectedExpressAd] = useState<string | null>(null)
  const [expressAdTab, setExpressAdTab] = useState<'recommended' | 'verification-free'>('recommended')
  const [placeOrderCountdown, setPlaceOrderCountdown] = useState(15)

  // Express mock rate (would come from API)
  const expressRate = expressMode === 'buy' ? 3.700 : 3.683

  // Calculate express amounts
  const calculateExpressReceive = (payAmount: string) => {
    const pay = parseFloat(payAmount)
    if (isNaN(pay)) return ''
    return expressMode === 'buy'
      ? (pay / expressRate).toFixed(4)
      : (pay * expressRate).toFixed(2)
  }

  // Express mock payment methods with rates
  const EXPRESS_PAYMENT_METHODS = [
    { id: 'enbd', name: 'Emirates NBD', rate: 3.790 },
    { id: 'cash', name: 'Cash Deposit to Bank', rate: 3.839 },
    { id: 'bank', name: 'Bank Transfer', rate: 3.865 },
    { id: 'adib', name: 'ADIB: Abu Dhabi Islamic Bank', rate: 3.865 },
    { id: 'adcb', name: 'Abu Dhabi Commercial Bank ADCB', rate: 3.865 },
  ]

  // Express mock traders with scorecard data
  const EXPRESS_RECOMMENDED_ADS = [
    { id: 'exp1', name: 'SalimCapital', badge: 'pro', orders: 519, completion: 99.90, rate: 3.790, requiresVerification: true, avgReleaseMin: 8, thumbsUp: 98.5, trades30d: 45 },
    { id: 'exp2', name: 'HappyCryptoAE', badge: 'pro-verified', orders: 290, completion: 100.00, rate: 3.845, requiresVerification: true, avgReleaseMin: 5, thumbsUp: 99.2, trades30d: 32 },
    { id: 'exp3', name: 'TRUSTED_CRYPTO_XCHANG', badge: 'diamond', orders: 224, completion: 97.40, rate: 3.839, requiresVerification: true, avgReleaseMin: 12, thumbsUp: 96.8, trades30d: 18 },
  ]

  const EXPRESS_VERIFICATION_FREE_ADS = [
    { id: 'exp4', name: 'DTBcrypto', badge: 'diamond', orders: 412, completion: 98.90, rate: 3.714, requiresVerification: false, avgReleaseMin: 6, thumbsUp: 97.9, trades30d: 38 },
    { id: 'exp5', name: 'ArabDu', badge: 'diamond', orders: 136, completion: 99.30, rate: 3.840, requiresVerification: false, avgReleaseMin: 15, thumbsUp: 98.1, trades30d: 12 },
    { id: 'exp6', name: 'TrustTradePro', badge: 'diamond', orders: 137, completion: 100.00, rate: 3.897, requiresVerification: false, avgReleaseMin: 4, thumbsUp: 99.8, trades30d: 15 },
  ]

  // Place order countdown effect
  useEffect(() => {
    if (expressStep === 3 && selectedExpressAd && placeOrderCountdown > 0) {
      const timer = setTimeout(() => setPlaceOrderCountdown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [expressStep, selectedExpressAd, placeOrderCountdown])

  // Reset countdown when ad changes
  useEffect(() => {
    if (selectedExpressAd) {
      setPlaceOrderCountdown(15)
    }
  }, [selectedExpressAd])

  // Sort dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [sortBy, setSortBy] = useState<'price' | 'orders' | 'completion' | 'rating'>('price')
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const SORT_OPTIONS = [
    { value: 'price', label: 'Price' },
    { value: 'orders', label: 'Completed order number' },
    { value: 'completion', label: 'Completion Rate' },
    { value: 'rating', label: 'Rating' },
  ] as const

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const adsPerPage = 11

  // Mock ads data based on Binance P2P design
  const MOCK_BUY_ADS = [
    { id: '1', traderName: 'Jooxrb', avatar: 'J', avatarColor: '#1E88E5', verified: false, orders: 314, completionRate: 99.70, thumbsUp: 97.67, responseTime: 15, price: 3.700, currency: 'AED', available: 3763.91, asset: 'USDT', minLimit: 1000, maxLimit: 13926, paymentMethods: ['Bank Transfer'] },
    { id: '2', traderName: 'QinXhao', avatar: 'Q', avatarColor: '#43A047', verified: true, orders: 77, completionRate: 100.00, thumbsUp: 95.11, responseTime: 15, price: 3.702, currency: 'AED', available: 59473.20, asset: 'USDT', minLimit: 49999, maxLimit: 50000, paymentMethods: ['Bank Transfer'] },
    { id: '3', traderName: 'Amounex', avatar: 'A', avatarColor: '#8E24AA', verified: true, orders: 421, completionRate: 100.00, thumbsUp: 99.83, responseTime: 15, price: 3.702, currency: 'AED', available: 52005.76, asset: 'USDT', minLimit: 19999, maxLimit: 50000, paymentMethods: ['Bank Transfer'] },
    { id: '4', traderName: 'Y3seenn', avatar: 'Y', avatarColor: '#FB8C00', verified: false, orders: 11, completionRate: 91.70, thumbsUp: 100.00, responseTime: 15, price: 3.702, currency: 'AED', available: 2438.88, asset: 'USDT', minLimit: 8900, maxLimit: 8962, paymentMethods: ['Bank Transfer'] },
    { id: '5', traderName: 'MrExchange444', avatar: 'M', avatarColor: '#00897B', verified: true, orders: 265, completionRate: 98.90, thumbsUp: 100.00, responseTime: 15, price: 3.702, currency: 'AED', available: 69689.26, asset: 'USDT', minLimit: 20000, maxLimit: 257989, paymentMethods: ['Bank Transfer'] },
    { id: '6', traderName: 'User-0aab4', avatar: 'U', avatarColor: '#E53935', verified: false, orders: 328, completionRate: 99.70, thumbsUp: 100.00, responseTime: 15, price: 3.703, currency: 'AED', available: 534.58, asset: 'USDT', minLimit: 1000, maxLimit: 1979, paymentMethods: ['Bank Transfer'] },
    { id: '7', traderName: 'CryptoKing', avatar: 'C', avatarColor: '#5E35B1', verified: true, orders: 892, completionRate: 99.85, thumbsUp: 98.45, responseTime: 10, price: 3.698, currency: 'AED', available: 125000.00, asset: 'USDT', minLimit: 5000, maxLimit: 100000, paymentMethods: ['Bank Transfer'] },
    { id: '8', traderName: 'FastTrader', avatar: 'F', avatarColor: '#039BE5', verified: true, orders: 1205, completionRate: 99.92, thumbsUp: 99.12, responseTime: 5, price: 3.699, currency: 'AED', available: 85000.00, asset: 'USDT', minLimit: 1000, maxLimit: 50000, paymentMethods: ['Bank Transfer'] },
    { id: '9', traderName: 'P2PMaster', avatar: 'P', avatarColor: '#C2185B', verified: true, orders: 2341, completionRate: 99.95, thumbsUp: 99.50, responseTime: 8, price: 3.701, currency: 'AED', available: 200000.00, asset: 'USDT', minLimit: 10000, maxLimit: 150000, paymentMethods: ['Bank Transfer'] },
    { id: '10', traderName: 'TradeHub', avatar: 'T', avatarColor: '#00838F', verified: true, orders: 678, completionRate: 99.40, thumbsUp: 97.80, responseTime: 12, price: 3.704, currency: 'AED', available: 42000.00, asset: 'USDT', minLimit: 2000, maxLimit: 30000, paymentMethods: ['Bank Transfer'] },
    { id: '11', traderName: 'CoinDealer', avatar: 'C', avatarColor: '#6D4C41', verified: false, orders: 189, completionRate: 98.50, thumbsUp: 96.20, responseTime: 20, price: 3.705, currency: 'AED', available: 18500.00, asset: 'USDT', minLimit: 1000, maxLimit: 12000, paymentMethods: ['Bank Transfer'] },
    { id: '12', traderName: 'SwiftExchange', avatar: 'S', avatarColor: '#455A64', verified: true, orders: 1456, completionRate: 99.80, thumbsUp: 98.90, responseTime: 6, price: 3.699, currency: 'AED', available: 95000.00, asset: 'USDT', minLimit: 5000, maxLimit: 75000, paymentMethods: ['Bank Transfer'] },
  ]

  const MOCK_SELL_ADS = [
    { id: '101', traderName: 'Tether_Official', avatar: 'T', avatarColor: '#26A69A', verified: false, orders: 12, completionRate: 92.40, thumbsUp: 98.63, responseTime: 15, price: 3.686, currency: 'AED', available: 1500.00, asset: 'USDT', minLimit: 5000, maxLimit: 5529, paymentMethods: ['Bank Transfer'] },
    { id: '102', traderName: 'LastHope_exchange', avatar: 'L', avatarColor: '#26A69A', verified: false, orders: 251, completionRate: 99.30, thumbsUp: 100.00, responseTime: 15, price: 3.685, currency: 'AED', available: 1193.08, asset: 'USDT', minLimit: 1000, maxLimit: 4396, paymentMethods: ['Aani', 'Bank Transfer', 'ADIB: Abu Dhabi Isla...'] },
    { id: '103', traderName: 'AA-Cr-Zeus', avatar: 'A', avatarColor: '#66BB6A', verified: false, orders: 24, completionRate: 100.00, thumbsUp: 99.42, responseTime: 30, price: 3.684, currency: 'AED', available: 479.80, asset: 'USDT', minLimit: 1765, maxLimit: 1766, paymentMethods: ['Bank Transfer'] },
    { id: '104', traderName: 'THR_Alrawahi', avatar: 'T', avatarColor: '#26A69A', verified: false, orders: 96, completionRate: 99.00, thumbsUp: 99.56, responseTime: 60, price: 3.683, currency: 'AED', available: 6800.00, asset: 'USDT', minLimit: 24999, maxLimit: 25000, paymentMethods: ['Cash Deposit to Bank'] },
    { id: '105', traderName: 'salimalrawahi', avatar: 'S', avatarColor: '#78909C', verified: false, orders: 182, completionRate: 100.00, thumbsUp: 98.91, responseTime: 180, price: 3.683, currency: 'AED', available: 6792.00, asset: 'USDT', minLimit: 22000, maxLimit: 25000, paymentMethods: ['Cash Deposit to Bank'] },
    { id: '106', traderName: 'Hossain', avatar: 'H', avatarColor: '#42A5F5', verified: true, orders: 64, completionRate: 94.20, thumbsUp: 97.50, responseTime: 15, price: 3.682, currency: 'AED', available: 27160.00, asset: 'USDT', minLimit: 30000, maxLimit: 100000, paymentMethods: ['Emirates NBD', 'ADIB: Abu Dhabi Isla...'] },
    { id: '107', traderName: 'QuickSeller', avatar: 'Q', avatarColor: '#7B1FA2', verified: true, orders: 534, completionRate: 99.80, thumbsUp: 99.20, responseTime: 8, price: 3.681, currency: 'AED', available: 45000.00, asset: 'USDT', minLimit: 5000, maxLimit: 35000, paymentMethods: ['Bank Transfer', 'Aani'] },
    { id: '108', traderName: 'CashKing_UAE', avatar: 'C', avatarColor: '#F57C00', verified: true, orders: 892, completionRate: 99.60, thumbsUp: 98.80, responseTime: 10, price: 3.680, currency: 'AED', available: 89000.00, asset: 'USDT', minLimit: 10000, maxLimit: 75000, paymentMethods: ['Bank Transfer'] },
    { id: '109', traderName: 'DubaiTrader', avatar: 'D', avatarColor: '#D32F2F', verified: true, orders: 1205, completionRate: 99.90, thumbsUp: 99.60, responseTime: 5, price: 3.679, currency: 'AED', available: 150000.00, asset: 'USDT', minLimit: 20000, maxLimit: 120000, paymentMethods: ['Emirates NBD', 'Bank Transfer'] },
    { id: '110', traderName: 'FastCash24', avatar: 'F', avatarColor: '#388E3C', verified: false, orders: 156, completionRate: 97.80, thumbsUp: 96.50, responseTime: 25, price: 3.685, currency: 'AED', available: 12500.00, asset: 'USDT', minLimit: 1000, maxLimit: 10000, paymentMethods: ['Bank Transfer'] },
    { id: '111', traderName: 'CryptoEmirates', avatar: 'C', avatarColor: '#1565C0', verified: true, orders: 445, completionRate: 99.20, thumbsUp: 98.10, responseTime: 12, price: 3.678, currency: 'AED', available: 65000.00, asset: 'USDT', minLimit: 8000, maxLimit: 50000, paymentMethods: ['Cash Deposit to Bank', 'Bank Transfer'] },
    { id: '112', traderName: 'GulfExchange', avatar: 'G', avatarColor: '#00695C', verified: true, orders: 789, completionRate: 99.70, thumbsUp: 99.00, responseTime: 8, price: 3.677, currency: 'AED', available: 110000.00, asset: 'USDT', minLimit: 15000, maxLimit: 90000, paymentMethods: ['Bank Transfer', 'Emirates NBD'] },
  ]

  // Use mock data instead of store data
  const mockAds = tradeType === 'buy' ? MOCK_BUY_ADS : MOCK_SELL_ADS

  // Filter by selected asset
  const filteredMockAds = mockAds.map(ad => ({
    ...ad,
    asset: selectedAsset,
    currency: selectedFiat
  }))

  // Pagination
  const totalPages = Math.ceil(filteredMockAds.length / adsPerPage)
  const paginatedAds = filteredMockAds.slice((currentPage - 1) * adsPerPage, currentPage * adsPerPage)

  useEffect(() => {
    fetchAds({ type: tradeType, asset: selectedAsset, fiatCurrency: selectedFiat || undefined, paymentMethod: selectedPayment || undefined })
    fetchBalances()
  }, [tradeType, selectedAsset, selectedFiat, selectedPayment, fetchAds, fetchBalances])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    navigate('/login')
  }

  const handleTradeClick = (ad: P2PAd) => {
    navigate(`/pro/trade/${ad.id}`)
  }

  const handleSelectCurrency = (code: string) => {
    setSelectedFiat(code)
    setShowCurrencyModal(false)
    setCurrencySearch('')
  }

  const handleSelectCrypto = (code: string) => {
    setSelectedAsset(code)
    setShowCryptoModal(false)
    setCryptoSearch('')
  }

  const handleTogglePayment = (method: string) => {
    setSelectedPayments(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    )
  }

  const handleConfirmPayments = () => {
    // Use first selected payment for filtering, or empty for "All"
    setSelectedPayment(selectedPayments.length === 1 ? selectedPayments[0] : '')
    setShowPaymentModal(false)
    setPaymentSearch('')
  }

  const handleResetPayments = () => {
    setSelectedPayments([])
    setSelectedPayment('')
  }

  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`currency-${letter}`)
    if (element && listRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Filter and group currencies
  const filteredCurrencies = useMemo(() => {
    const search = currencySearch.toLowerCase()
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search)
    )
  }, [currencySearch])

  const groupedCurrencies = useMemo(() => {
    const groups: Record<string, typeof CURRENCIES> = {}
    filteredCurrencies.forEach(currency => {
      const letter = currency.code[0]
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(currency)
    })
    return groups
  }, [filteredCurrencies])

  // Filter crypto assets
  const filteredCryptos = useMemo(() => {
    const search = cryptoSearch.toLowerCase()
    return CRYPTO_ASSETS.filter(c =>
      c.code.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search)
    )
  }, [cryptoSearch])

  // Get payment methods for selected currency
  const availablePaymentMethods = useMemo(() => {
    return PAYMENT_METHODS_BY_CURRENCY[selectedFiat] || PAYMENT_METHODS_BY_CURRENCY.DEFAULT
  }, [selectedFiat])

  // Filter payment methods
  const filteredPaymentMethods = useMemo(() => {
    const search = paymentSearch.toLowerCase()
    return availablePaymentMethods.filter(m => m.toLowerCase().includes(search))
  }, [paymentSearch, availablePaymentMethods])

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedFiat)
  const selectedCryptoData = CRYPTO_ASSETS.find(c => c.code === selectedAsset)
  const userBalance = balances.find(b => b.asset === selectedAsset)

  // Get currency prefix for display
  const getCurrencyPrefix = (code: string) => CURRENCY_PREFIXES[code] || ''

  // Get payment method color
  const getPaymentColor = (method: string) => PAYMENT_METHOD_COLORS[method] || PAYMENT_METHOD_COLORS.DEFAULT

  // Mock user stats (replace with real data from API)
  const userStats = {
    trades30d: 25,
    completionRate: 92.59,
    avgReleaseTime: 4.29,
    avgPayTime: 3.63,
    positiveFeedback: 98.04,
    feedbackCount: 950,
  }

  const [activeTab, setActiveTab] = useState<'express' | 'p2p' | 'block'>('p2p')

  return (
    <div className={`min-h-screen ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-6">
              <Link to="/app" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-orange-500">CyxTrade</span>
              </Link>

              {/* Main Navigation Tabs */}
              <nav className="hidden md:flex items-center">
                <button
                  onClick={() => setActiveTab('express')}
                  className={`px-4 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'express'
                      ? 'text-orange-500 border-orange-500'
                      : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
                  }`}
                >
                  Express
                </button>
                <button
                  onClick={() => setActiveTab('p2p')}
                  className={`px-4 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'p2p'
                      ? 'text-orange-500 border-orange-500'
                      : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
                  }`}
                >
                  P2P
                </button>
                <button
                  onClick={() => setActiveTab('block')}
                  className={`px-4 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'block'
                      ? 'text-orange-500 border-orange-500'
                      : `${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} border-transparent`
                  }`}
                >
                  Block Trade
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${dark ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Currency Selector */}
              <button
                onClick={() => setShowCurrencyModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded hover:opacity-80 transition text-sm ${
                  dark ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-700'
                }`}
              >
                <span className="font-medium">{selectedFiat}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <Link to="/pro/orders" className={`text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Orders</Link>
              <Link to="/pro/wallet" className={`text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Wallet</Link>

              {/* Chat */}
              <Link to="/pro/chat" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </Link>

              {/* User Center */}
              <Link to="/pro/user-center" className={`flex items-center gap-1 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                User Center
              </Link>

              {/* More dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-1.5 text-sm ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  More
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`absolute right-0 mt-2 w-52 rounded-lg shadow-xl border py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <Link to="/pro/user-center" className={`flex items-center gap-3 px-4 py-2.5 text-sm ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Payment Methods
                  </Link>
                  <Link to="/pro/post-ad" className={`flex items-center gap-3 px-4 py-2.5 text-sm ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Post new Ad
                  </Link>
                  <Link to="/pro/my-ads" className={`flex items-center gap-3 px-4 py-2.5 text-sm ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    My ads
                  </Link>
                  <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm cursor-pointer ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      P2P Help Center
                    </div>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className={`border-t my-1 ${dark ? 'border-gray-700' : 'border-gray-200'}`}></div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Tabs */}
      <nav className={`md:hidden flex border-b ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('express')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'express'
              ? 'text-orange-500 border-orange-500'
              : `${dark ? 'text-gray-400' : 'text-gray-500'} border-transparent`
          }`}
        >
          Express
        </button>
        <button
          onClick={() => setActiveTab('p2p')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'p2p'
              ? 'text-orange-500 border-orange-500'
              : `${dark ? 'text-gray-400' : 'text-gray-500'} border-transparent`
          }`}
        >
          P2P
        </button>
        <button
          onClick={() => setActiveTab('block')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'block'
              ? 'text-orange-500 border-orange-500'
              : `${dark ? 'text-gray-400' : 'text-gray-500'} border-transparent`
          }`}
        >
          Block Trade
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Promotional Banner */}
        <div className={`relative rounded-xl overflow-hidden mb-6 ${dark ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500'}`}>
          <div className="absolute inset-0 opacity-20">
            <div className={`absolute top-4 right-20 w-24 h-24 rounded-full ${dark ? 'bg-green-500/30' : 'bg-white/30'}`}></div>
            <div className={`absolute top-8 right-8 w-16 h-16 rounded-full ${dark ? 'bg-orange-500/30' : 'bg-white/30'}`}></div>
          </div>
          <div className="relative px-6 py-8 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className={`text-sm font-medium mb-1 ${dark ? 'text-orange-500' : 'text-white/80'}`}>CYXTRADE</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                SELL USDT & USDC SAFER & FASTER VIA
              </h2>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                DIRECT BANK TRANSFER
              </h2>
            </div>
            <Link
              to="/pro/post-ad"
              className={`inline-flex items-center justify-center px-6 py-3 font-semibold rounded-lg transition whitespace-nowrap ${dark ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
            >
              JOIN HERE
            </Link>
          </div>
        </div>

        {/* ============================================ */}
        {/* EXPRESS TAB CONTENT */}
        {/* ============================================ */}
        {activeTab === 'express' && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Title and Description */}
            <div className="lg:w-1/2">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">P2P Express</h1>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {expressMode === 'buy' ? 'Buy' : 'Sell'} {selectedAsset} with {selectedFiat}
              </h2>
              <p className={`${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                Buy and Sell {selectedAsset} on CyxTrade P2P with various payment methods
              </p>

              {/* Breadcrumb for steps 2 and 3 */}
              {expressStep > 1 && (
                <div className="flex items-center gap-2 mt-6 text-sm">
                  <button
                    onClick={() => { setExpressStep(1); setSelectedExpressPayment(''); setSelectedExpressAd(null); }}
                    className={`${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Express
                  </button>
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <button
                    onClick={() => { setExpressStep(2); setSelectedExpressAd(null); }}
                    className={expressStep === 2 ? 'text-white font-medium' : `${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Payment Method
                  </button>
                  {expressStep === 3 && (
                    <>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-white font-medium">Select Ad</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Form Card */}
            <div className="lg:w-1/2">
              {/* Step 1: Amount Input */}
              {expressStep === 1 && (
                <div className={`rounded-2xl p-6 ${dark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                  {/* Buy/Sell Toggle */}
                  <div className="flex mb-6">
                    <button
                      onClick={() => setExpressMode('buy')}
                      className={`flex-1 py-3 text-center font-medium rounded-l-lg transition ${
                        expressMode === 'buy'
                          ? 'bg-gray-700 text-white'
                          : `${dark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setExpressMode('sell')}
                      className={`flex-1 py-3 text-center font-medium rounded-r-lg transition ${
                        expressMode === 'sell'
                          ? 'bg-gray-700 text-white'
                          : `${dark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* You Pay Input */}
                  <div className={`rounded-lg border p-4 mb-4 ${dark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {expressMode === 'buy' ? 'You Pay' : 'You Sell'}
                      </span>
                      {expressMode === 'sell' && userBalance && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>
                            Balance: {userBalance.available} {selectedAsset}
                          </span>
                          <button className="text-green-500 hover:text-green-400 font-medium">Add Funds</button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={expressPayAmount}
                        onChange={(e) => {
                          setExpressPayAmount(e.target.value)
                          setExpressReceiveAmount(calculateExpressReceive(e.target.value))
                        }}
                        placeholder={expressMode === 'buy' ? '100-1000000' : '27.3448-5000'}
                        className={`flex-1 text-xl bg-transparent outline-none ${dark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                      />
                      {expressMode === 'sell' && (
                        <button
                          onClick={() => {
                            const max = userBalance?.available || '5000'
                            setExpressPayAmount(max)
                            setExpressReceiveAmount(calculateExpressReceive(max))
                          }}
                          className="text-sm text-yellow-500 hover:text-yellow-400 font-medium"
                        >
                          All
                        </button>
                      )}
                      <button
                        onClick={() => setShowCryptoModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: selectedCryptoData?.color || '#26A17B' }}
                        >
                          {selectedCryptoData?.icon || '₮'}
                        </span>
                        <span className="text-white font-medium">{expressMode === 'buy' ? selectedFiat : selectedAsset}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* You Receive Input */}
                  <div className={`rounded-lg border p-4 mb-6 ${dark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>You Receive</span>
                      <span className="text-xs text-green-500 font-medium">3.78% APR</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={expressReceiveAmount}
                        readOnly
                        placeholder={expressMode === 'buy' ? '20.6313-5000' : '100-7000000'}
                        className={`flex-1 text-xl bg-transparent outline-none ${dark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                      />
                      <button
                        onClick={() => setShowCurrencyModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: expressMode === 'buy' ? (selectedCryptoData?.color || '#26A17B') : (selectedCurrencyData?.color || '#2E7D32') }}
                        >
                          {expressMode === 'buy' ? (selectedCryptoData?.icon || '₮') : (selectedCurrencyData?.symbol.slice(0, 1) || '$')}
                        </span>
                        <span className="text-white font-medium">{expressMode === 'buy' ? selectedAsset : selectedFiat}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Estimated Price */}
                  <div className={`text-sm mb-6 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>Estimated price </span>
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="ml-2">1 {selectedAsset} ≈ {expressRate.toFixed(3)} {selectedFiat}</span>
                  </div>

                  {/* Select Payment Method Button */}
                  <button
                    onClick={() => setExpressStep(2)}
                    disabled={!expressPayAmount || parseFloat(expressPayAmount) <= 0}
                    className={`w-full py-4 rounded-lg font-semibold transition ${
                      expressMode === 'buy'
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white'
                        : 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white'
                    }`}
                  >
                    Select Payment Method
                  </button>
                </div>
              )}

              {/* Step 2: Payment Method Selection */}
              {expressStep === 2 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-6">Select Payment Method</h3>
                  <div className="space-y-3">
                    {EXPRESS_PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedExpressPayment(method.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition ${
                          selectedExpressPayment === method.id
                            ? 'border-yellow-500 bg-gray-800'
                            : `${dark ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300'}`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-4 rounded-full bg-yellow-500"></span>
                          <span className="text-white font-medium">{method.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                            1 {selectedAsset} = {method.rate.toFixed(3)} {selectedFiat}
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedExpressPayment === method.id
                              ? 'border-white bg-white'
                              : `${dark ? 'border-gray-600' : 'border-gray-300'}`
                          }`}>
                            {selectedExpressPayment === method.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-900"></div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Select Ad Button */}
                  <button
                    onClick={() => {
                      setExpressStep(3)
                      // Auto-select first ad
                      const ads = expressAdTab === 'recommended' ? EXPRESS_RECOMMENDED_ADS : EXPRESS_VERIFICATION_FREE_ADS
                      if (ads.length > 0) setSelectedExpressAd(ads[0].id)
                    }}
                    disabled={!selectedExpressPayment}
                    className="w-full py-4 mt-6 rounded-lg font-semibold bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/50 text-gray-900 transition"
                  >
                    Select Ad
                  </button>
                </div>
              )}

              {/* Step 3: Select Preferred Ad */}
              {expressStep === 3 && (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Ad List */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-4">Select Preferred Ad</h3>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => {
                          setExpressAdTab('recommended')
                          if (EXPRESS_RECOMMENDED_ADS.length > 0) setSelectedExpressAd(EXPRESS_RECOMMENDED_ADS[0].id)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          expressAdTab === 'recommended'
                            ? 'bg-yellow-500 text-gray-900'
                            : `${dark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`
                        }`}
                      >
                        Recommended Ad
                      </button>
                      <button
                        onClick={() => {
                          setExpressAdTab('verification-free')
                          if (EXPRESS_VERIFICATION_FREE_ADS.length > 0) setSelectedExpressAd(EXPRESS_VERIFICATION_FREE_ADS[0].id)
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                          expressAdTab === 'verification-free'
                            ? 'bg-gray-700 text-white'
                            : `${dark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`
                        }`}
                      >
                        Verification-free
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Ad Cards */}
                    <div className="space-y-3">
                      {(expressAdTab === 'recommended' ? EXPRESS_RECOMMENDED_ADS : EXPRESS_VERIFICATION_FREE_ADS).map((ad, idx) => (
                        <button
                          key={ad.id}
                          onClick={() => setSelectedExpressAd(ad.id)}
                          className={`w-full p-4 rounded-lg border text-left transition ${
                            selectedExpressAd === ad.id
                              ? 'border-orange-500 bg-gray-800'
                              : `${dark ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300'}`
                          }`}
                        >
                          {idx === 0 && (
                            <span className="inline-block px-2 py-0.5 mb-2 text-xs font-medium bg-yellow-500/20 text-yellow-500 rounded">
                              Best offer
                            </span>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{ad.name}</span>
                                {ad.badge === 'pro' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded">Pro</span>
                                )}
                                {ad.badge === 'pro-verified' && (
                                  <>
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded">Pro</span>
                                    <span className="text-blue-400">✓</span>
                                  </>
                                )}
                                {ad.badge === 'diamond' && (
                                  <span className="text-yellow-500">💎</span>
                                )}
                              </div>
                              {/* Scorecard stats row */}
                              <div className={`flex items-center gap-2 text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span>{ad.orders} orders</span>
                                <span>|</span>
                                <span className={ad.completion >= 99 ? 'text-green-400' : ''}>{ad.completion.toFixed(1)}%</span>
                                <span>|</span>
                                <span className="flex items-center gap-0.5">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                  </svg>
                                  {ad.thumbsUp}%
                                </span>
                              </div>
                              {/* Trust indicators */}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                {ad.avgReleaseMin < 10 && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">
                                    ⚡ ~{ad.avgReleaseMin}m release
                                  </span>
                                )}
                                {ad.trades30d > 20 && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">
                                    📅 {ad.trades30d} this month
                                  </span>
                                )}
                              </div>
                              {idx === 0 && (
                                <button className={`text-sm mt-1 flex items-center gap-1 ${dark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}>
                                  View Ad Requirements
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-white">{ad.rate.toFixed(3)}</span>
                              <span className={`ml-1 text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>د.إ</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button className="w-full mt-4 text-center text-yellow-500 hover:text-yellow-400 text-sm font-medium">
                      Find more options
                    </button>
                  </div>

                  {/* Right: Preview Order */}
                  <div className={`lg:w-72 p-6 rounded-2xl ${dark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                    <h4 className="text-lg font-bold text-white mb-4">Preview Order</h4>

                    {expressAdTab === 'recommended' && (
                      <span className="inline-block px-2 py-1 mb-4 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                        Requires verification
                      </span>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm flex items-center gap-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Payment time limit
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span className="text-white font-medium">15 min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>You Pay</span>
                        <span className="text-white font-medium">
                          {expressPayAmount ? parseFloat(expressPayAmount).toLocaleString(undefined, { minimumFractionDigits: 3 }) : '0.000'} {selectedFiat}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>You Receive</span>
                        <span className="text-white font-bold text-lg">
                          {expressReceiveAmount || '0.00'} {selectedAsset}
                        </span>
                      </div>
                    </div>

                    {/* Auto-subscribe toggle */}
                    <div className={`flex items-center justify-between p-3 mt-4 rounded-lg ${dark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Auto-subscribe to Earn</span>
                        <span className="text-xs text-green-500 font-medium">3.78% APR</span>
                      </div>
                      <button
                        onClick={() => setAutoSubscribe(!autoSubscribe)}
                        className={`w-10 h-5 rounded-full transition ${autoSubscribe ? 'bg-green-500' : 'bg-gray-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transform transition ${autoSubscribe ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {/* Place Order Button */}
                    <button
                      onClick={() => {
                        // Would navigate to order page or create order
                        navigate('/pro/orders')
                      }}
                      disabled={!selectedExpressAd}
                      className="w-full py-4 mt-6 rounded-lg font-semibold bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white transition"
                    >
                      Place Order ({placeOrderCountdown}s)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* BLOCK TRADE TAB CONTENT */}
        {/* ============================================ */}
        {activeTab === 'block' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <svg className={`w-10 h-10 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Block Trade</h3>
            <p className={`text-center max-w-md ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              Block trading for large volume transactions. Coming soon to CyxTrade Pro.
            </p>
          </div>
        )}

        {/* ============================================ */}
        {/* P2P TAB CONTENT */}
        {/* ============================================ */}
        {activeTab === 'p2p' && (
        <>
        {/* Buy/Sell Toggle + Crypto Tabs Row */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Buy/Sell Toggle - Small */}
          <div className="flex items-center gap-4">
            <div className={`inline-flex rounded-lg p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => { setTradeType('buy'); setCurrentPage(1); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                  tradeType === 'buy'
                    ? 'bg-green-500 text-white'
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => { setTradeType('sell'); setCurrentPage(1); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                  tradeType === 'sell'
                    ? 'bg-red-500 text-white'
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Sell
              </button>
            </div>

            {/* Crypto Tabs */}
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1">
                {CRYPTO_ASSETS.slice(0, 12).map(crypto => (
                  <button
                    key={crypto.code}
                    onClick={() => setSelectedAsset(crypto.code)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                      selectedAsset === crypto.code
                        ? `${dark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`
                        : `${dark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`
                    }`}
                  >
                    {crypto.code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Transaction Amount with Currency Selector */}
            <div className={`flex items-center rounded-lg border text-sm transition overflow-hidden ${
              dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}>
              {/* Amount Input */}
              <input
                type="text"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                placeholder="Transaction amount"
                className={`w-36 px-3 py-2 outline-none bg-transparent ${
                  dark ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
                }`}
              />
              {/* Separator */}
              <div className={`h-6 w-px ${dark ? 'bg-gray-600' : 'bg-gray-300'}`} />
              {/* Currency Selector */}
              <button
                onClick={() => setShowCurrencyModal(true)}
                className={`flex items-center gap-2 px-3 py-2 transition ${
                  dark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                {selectedCurrencyData && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: selectedCurrencyData.color }}
                  >
                    {selectedCurrencyData.symbol.slice(0, 1)}
                  </span>
                )}
                <span className="font-medium">{selectedFiat}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* All Payment Methods */}
            <button
              onClick={() => setShowPaymentModal(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                dark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <span>{selectedPayment || 'All payment methods'}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Filter Icon */}
            <button
              onClick={() => fetchAds({ type: tradeType, asset: selectedAsset, fiatCurrency: selectedFiat || undefined, paymentMethod: selectedPayment || undefined })}
              className={`p-2 rounded-lg border transition ${
                dark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
              title="Filter"
            >
              <svg className={`w-5 h-5 ${dark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Sort By Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  showSortDropdown
                    ? 'border-orange-500 bg-gray-800'
                    : dark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Sort By</span>
                <span className={`font-medium ${showSortDropdown ? 'text-orange-500' : dark ? 'text-white' : 'text-gray-900'}`}>
                  {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180 text-orange-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showSortDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg z-50 py-2 ${
                  dark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value)
                        setShowSortDropdown(false)
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition ${
                        dark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      } ${sortBy === option.value ? (dark ? 'text-white' : 'text-gray-900') : (dark ? 'text-gray-400' : 'text-gray-600')}`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className={`hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wider ${
          dark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <div className="col-span-3">Advertisers</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-3">Available/Order Limit</div>
          <div className="col-span-2">Payment</div>
          <div className="col-span-2 text-right">Trade</div>
        </div>

        {/* Error */}
        {error && (
          <div className={`px-4 py-3 rounded-xl mb-6 border ${dark ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {error}
          </div>
        )}

        {/* Ads List */}
        <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {paginatedAds.map(ad => (
            <div key={ad.id}>
              {/* Ad Row */}
              <div
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 py-4 px-4 transition ${
                  expandedAdId === ad.id
                    ? dark ? 'bg-gray-800/50' : 'bg-gray-50'
                    : ''
                }`}
              >
                {/* Advertisers - col-span-3 */}
                <div className="md:col-span-3 flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: ad.avatarColor }}
                    >
                      {ad.avatar}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-medium text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{ad.traderName}</p>
                      {ad.verified && (
                        <span className="text-yellow-500 text-xs">●</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span>{ad.orders} orders</span>
                      <span className={dark ? 'text-gray-600' : 'text-gray-300'}>|</span>
                      <span>{ad.completionRate.toFixed(2)}% completion</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span className={ad.thumbsUp >= 98 ? 'text-green-400' : ''}>{ad.thumbsUp}%</span>
                      <span className={dark ? 'text-gray-600' : 'text-gray-300'}>|</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={ad.responseTime <= 10 ? 'text-green-400' : ''}>{ad.responseTime} min</span>
                      {/* Trust indicators */}
                      {(ad.responseTime <= 10 || ad.completionRate >= 99.5 || ad.orders >= 500) && (
                        <>
                          <span className={dark ? 'text-gray-600' : 'text-gray-300'}>|</span>
                          {ad.responseTime <= 10 && <span className="text-green-400">⚡</span>}
                          {ad.completionRate >= 99.5 && <span className="text-yellow-400">🎯</span>}
                          {ad.orders >= 500 && <span className="text-blue-400">🏆</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price - col-span-2 */}
                <div className="md:col-span-2 flex items-center">
                  <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                    <span className={`text-xs font-normal mr-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{getCurrencyPrefix(ad.currency)}</span>
                    {ad.price.toFixed(3)}
                  </p>
                </div>

                {/* Available/Order Limit - col-span-3 */}
                <div className="md:col-span-3 flex flex-col justify-center">
                  <div className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {ad.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ad.asset}
                  </div>
                  <div className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {ad.minLimit.toLocaleString()}.000 {ad.currency} - {ad.maxLimit.toLocaleString()}.000 {ad.currency}
                  </div>
                </div>

                {/* Payment - col-span-2 */}
                <div className="md:col-span-2 flex flex-col justify-center gap-1">
                  {ad.paymentMethods.slice(0, 3).map((method, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span
                        className="w-0.5 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#F0B90B' }}
                      ></span>
                      <span className={`text-xs truncate ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{method}</span>
                    </div>
                  ))}
                </div>

                {/* Trade Button - col-span-2 */}
                <div className="md:col-span-2 flex items-center justify-end">
                  <button
                    className={`px-6 py-2 rounded text-sm font-medium transition ${
                      tradeType === 'buy'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-[#F6465D] hover:bg-[#E5384F] text-white'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (expandedAdId === ad.id) {
                        setExpandedAdId(null)
                        setOrderAmount('')
                        setAutoSubscribe(false)
                      } else {
                        setExpandedAdId(ad.id)
                        setOrderAmount('')
                        setAutoSubscribe(false)
                      }
                    }}
                  >
                    {tradeType === 'buy' ? `Buy ${ad.asset}` : `Sell ${ad.asset}`}
                  </button>
                </div>
              </div>

              {/* Expanded Order Form Section */}
              {expandedAdId === ad.id && (
                <div className={`px-4 pb-6 ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <div className={`rounded-lg p-6 ${dark ? 'bg-gray-900/50' : 'bg-white shadow-sm border border-gray-200'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left Side: Advertiser's Terms */}
                      <div>
                        <h3 className={`text-sm font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>
                          Advertiser's Terms <span className={`font-normal ${dark ? 'text-gray-500' : 'text-gray-400'}`}>(Please read carefully)</span>
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <svg className={`w-3 h-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {ad.terms || 'Please make sure to complete payment within the payment window. Contact me via chat if you have any issues.'}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <svg className={`w-3 h-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Verified traders only. Please have your payment method ready before starting the trade.
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <svg className={`w-3 h-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Average release time: {ad.responseTime} minutes. I'm online and ready to trade.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Order Form */}
                      <div>
                        {/* Price Display */}
                        <div className="mb-4">
                          <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Price</span>
                          <p className={`text-xl font-semibold ${tradeType === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {getCurrencyPrefix(ad.currency)} {ad.price.toFixed(2)} <span className={`text-xs font-normal ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{ad.currency}</span>
                          </p>
                        </div>

                        {/* You Pay / You Receive Input */}
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-xs mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {tradeType === 'buy' ? 'You Pay' : 'You Receive'}
                            </label>
                            <div className={`flex items-center rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
                              <input
                                type="text"
                                value={orderAmount}
                                onChange={(e) => setOrderAmount(e.target.value)}
                                placeholder={`${ad.minLimit.toLocaleString()} - ${ad.maxLimit.toLocaleString()}`}
                                className={`flex-1 px-4 py-3 bg-transparent outline-none text-sm ${dark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                              />
                              <span className={`px-4 py-3 text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{ad.currency}</span>
                              <button
                                onClick={() => setOrderAmount(ad.maxLimit.toString())}
                                className="px-3 py-1 mr-2 text-xs font-medium text-orange-500 hover:text-orange-400 transition"
                              >
                                All
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className={`block text-xs mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {tradeType === 'buy' ? 'You Receive' : 'You Pay'}
                            </label>
                            <div className={`flex items-center rounded-lg border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
                              <input
                                type="text"
                                value={orderAmount ? (parseFloat(orderAmount) / ad.price).toFixed(6) : ''}
                                readOnly
                                placeholder="0.00"
                                className={`flex-1 px-4 py-3 bg-transparent outline-none text-sm ${dark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                              />
                              <span className={`px-4 py-3 text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{ad.asset}</span>
                            </div>
                          </div>

                          {/* Payment Method Selection */}
                          <div>
                            <label className={`block text-xs mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Payment Method</label>
                            <div className="flex flex-wrap gap-2">
                              {ad.paymentMethods.map((method, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (selectedPayments.includes(method)) {
                                      setSelectedPayments(selectedPayments.filter(p => p !== method))
                                    } else {
                                      setSelectedPayments([...selectedPayments, method])
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition border ${
                                    selectedPayments.includes(method)
                                      ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                                      : dark
                                        ? 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400'
                                  }`}
                                >
                                  {method}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Auto-subscribe */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Auto-subscribe to ads from this advertiser</span>
                              <svg className={`w-4 h-4 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <button
                              onClick={() => setAutoSubscribe(!autoSubscribe)}
                              className={`relative w-11 h-6 rounded-full transition-colors ${
                                autoSubscribe ? 'bg-orange-500' : dark ? 'bg-gray-700' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                  autoSubscribe ? 'translate-x-5' : ''
                                }`}
                              />
                            </button>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => {
                                if (orderAmount && parseFloat(orderAmount) >= ad.minLimit) {
                                  navigate(`/pro/trade/${ad.id}?amount=${orderAmount}`)
                                }
                              }}
                              disabled={!orderAmount || parseFloat(orderAmount) < ad.minLimit || parseFloat(orderAmount) > ad.maxLimit}
                              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
                                tradeType === 'buy'
                                  ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/50 disabled:cursor-not-allowed'
                                  : 'bg-[#F6465D] hover:bg-[#E5384F] text-white disabled:bg-[#F6465D]/50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {tradeType === 'buy' ? `Buy ${ad.asset}` : `Sell ${ad.asset}`}
                            </button>
                            <button
                              onClick={() => {
                                setExpandedAdId(null)
                                setOrderAmount('')
                                setAutoSubscribe(false)
                                setSelectedPayments([])
                              }}
                              className={`px-6 py-3 rounded-lg text-sm font-medium transition border ${
                                dark
                                  ? 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                                  : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                              }`}
                            >
                              Hide
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-6">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded transition ${
                currentPage === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded text-sm font-medium transition ${
                    currentPage === pageNum
                      ? 'bg-gray-700 text-white'
                      : dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            {/* Ellipsis and Last Page */}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className={dark ? 'text-gray-600' : 'text-gray-400'}>...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-8 h-8 rounded text-sm font-medium transition ${
                    dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded transition ${
                currentPage === totalPages
                  ? 'text-gray-600 cursor-not-allowed'
                  : dark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* How P2P Works Section */}
        {/* ============================================ */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>How P2P Works</h2>
            <div className={`inline-flex rounded-lg p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => { setTradeType('buy'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  tradeType === 'buy'
                    ? 'bg-orange-500 text-white'
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Buy Crypto
              </button>
              <button
                onClick={() => { setTradeType('sell'); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  tradeType === 'sell'
                    ? 'bg-orange-500 text-white'
                    : `${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                Sell Crypto
              </button>
            </div>
          </div>

          {/* Steps Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className={`p-6 rounded-xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="mb-4">
                <div className="relative inline-block">
                  <svg className={`w-12 h-12 ${dark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="w-2 h-2 bg-orange-300 rounded-full"></span>
                  </span>
                </div>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>1. Place an Order</h3>
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {tradeType === 'buy'
                  ? 'Once you place a P2P order, the crypto asset will be escrowed by CyxTrade P2P.'
                  : 'After you place an order, your crypto will be escrowed by CyxTrade P2P.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-6 rounded-xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="mb-4">
                <div className="relative inline-block">
                  {tradeType === 'buy' ? (
                    <svg className={`w-12 h-12 ${dark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ) : (
                    <svg className={`w-12 h-12 ${dark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="w-2 h-2 bg-orange-300 rounded-full"></span>
                  </span>
                </div>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                {tradeType === 'buy' ? '2. Pay the Seller' : '2. Verify Payment'}
              </h3>
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {tradeType === 'buy'
                  ? 'Send money to the seller via the suggested payment methods. Complete the fiat transaction and click "Transferred, notify seller" on CyxTrade P2P.'
                  : 'Check the transaction record in the given payment account, and make sure you receive the money sent by the buyer.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-6 rounded-xl border ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="mb-4">
                <div className="relative inline-block">
                  <svg className={`w-12 h-12 ${dark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </span>
                </div>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                {tradeType === 'buy' ? '3. Receive Crypto' : '3. Release Crypto'}
              </h3>
              <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {tradeType === 'buy'
                  ? 'Once the seller confirms receipt of money, the escrowed crypto will be released to you.'
                  : 'Once you confirm the receipt of money, release crypto to the buyer on CyxTrade P2P.'}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* Advantages Section */}
        {/* ============================================ */}
        <div className="mt-16">
          <h2 className={`text-2xl font-bold mb-8 ${dark ? 'text-white' : 'text-gray-900'}`}>Advantages of P2P Exchange</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Features List */}
            <div className="space-y-8">
              {/* Global Marketplace */}
              <div>
                <div className="text-orange-500 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Global and Local Marketplace</h3>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Where as many other P2P platforms target specific markets, CyxTrade P2P provides a truly global trading experience with support for more than 70 local currencies.
                </p>
              </div>

              {/* Flexible Payment */}
              <div>
                <div className="text-orange-500 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Flexible Payment Methods</h3>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Trusted by millions of users worldwide, CyxTrade P2P provides a safe platform to conduct crypto trades in 800+ payment methods and 100+ fiat currencies.
                </p>
              </div>

              {/* Trade at Your Prices */}
              <div>
                <div className="text-orange-500 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Trade at Your Preferred Prices</h3>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Trade crypto with the freedom to buy and sell at your preferred prices. Buy or sell from the existing offers, or create trade advertisements to set your own prices.
                </p>
              </div>
            </div>

            {/* Right - Illustration */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                {/* Decorative elements */}
                <div className={`w-64 h-48 rounded-2xl ${dark ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full ${dark ? 'bg-gray-600' : 'bg-gray-300'} flex items-center justify-center`}>
                      <svg className={`w-6 h-6 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div className={`w-12 h-12 rounded-lg ${dark ? 'bg-gray-600' : 'bg-gray-300'} flex items-center justify-center rotate-12`}>
                      <span className="text-orange-500 font-bold">◇</span>
                    </div>
                  </div>
                </div>
                {/* Yellow badge */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center rotate-12">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {/* Sparkles */}
                <div className="absolute -top-8 left-0 text-orange-500 text-2xl">✦</div>
                <div className="absolute top-0 -left-8 text-orange-400 text-lg">✦</div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* P2P Blog Section */}
        {/* ============================================ */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>P2P Blog</h2>
            <button className="text-orange-500 hover:text-orange-400 text-sm font-medium flex items-center gap-1">
              View more
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Blog Card 1 */}
            <div className={`rounded-xl overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
              <div className="h-40 bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center p-4">
                <div className="text-center">
                  <span className="text-orange-200 text-xs font-medium">CYXTRADE</span>
                  <h4 className="text-white font-bold text-lg mt-1">P2P MERCHANT PROGRAM</h4>
                  <p className="text-orange-100 text-xs mt-1">Comprehensive Guide</p>
                </div>
              </div>
              <div className="p-4">
                <h3 className={`font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  How to Become a CyxTrade P2P Merchant in 2025 – Complete Guide and Perks Explained
                </h3>
                <p className={`text-xs mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Become a P2P Merchant to boost earnings with 1,000+ payment methods, 120+ fiat currencies, fee rebates, higher ad limits, and priority support.
                </p>
                <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>2025-11-17</p>
              </div>
            </div>

            {/* Blog Card 2 */}
            <div className={`rounded-xl overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
              <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center p-4">
                <div className="text-center">
                  <span className="text-orange-500 text-xs font-medium">CYXTRADE P2P</span>
                  <div className="mt-4">
                    <svg className="w-16 h-16 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className={`font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  CyxTrade P2P Appeals Explained – How to Handle Disputes and Protect Your Funds
                </h3>
                <p className={`text-xs mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  If a transaction doesn't go smoothly, CyxTrade P2P offers the opportunity for buyers and sellers to file an appeal.
                </p>
                <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>2025-11-07</p>
              </div>
            </div>

            {/* Blog Card 3 */}
            <div className={`rounded-xl overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
              <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center p-4">
                <div className="text-center">
                  <span className="text-orange-500 text-xs font-medium">CYXTRADE P2P</span>
                  <h4 className="text-white font-bold text-lg mt-2">AD BIDDING</h4>
                  <p className="text-gray-400 text-xs mt-1">Unlock the Potential with This<br/>Complete Guide for Merchants</p>
                </div>
              </div>
              <div className="p-4">
                <h3 className={`font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  How to Use CyxTrade P2P Ad Bidding – A Guide for Merchants
                </h3>
                <p className={`text-xs mb-3 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Learn how to boost your crypto ad visibility and attract more buyers by using CyxTrade P2P Ad Bidding as a verified merchant.
                </p>
                <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>2025-11-05</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* FAQs Section */}
        {/* ============================================ */}
        <div className="mt-16 mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>FAQs</h2>
            <div className={`inline-flex rounded-lg p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-gray-700 text-white">
                Beginner
              </button>
              <button className={`px-4 py-1.5 rounded-md text-sm font-medium ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Advanced
              </button>
              <button className={`px-4 py-1.5 rounded-md text-sm font-medium ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Advertisers
              </button>
            </div>
          </div>

          <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {[
              { num: 1, question: 'What is P2P exchange?', expandable: true },
              { num: 2, question: 'How do I sell Bitcoin locally on CyxTrade P2P?', expandable: true },
              { num: 3, question: 'Which cryptocurrencies are supported in the P2P trade zone?', expandable: true },
              { num: 4, question: 'Glossary of P2P trading terms', expandable: false },
              { num: 5, question: 'How to add new payment methods on CyxTrade P2P?', expandable: false },
              { num: 6, question: 'How do I buy Bitcoin locally on CyxTrade P2P?', expandable: true },
              { num: 7, question: 'Why is CyxTrade P2P better than other P2P marketplaces?', expandable: true },
              { num: 8, question: 'How do I protect myself against fraud? CyxTrade P2P Escrow FTW!', expandable: true },
              { num: 9, question: 'CyxTrade P2P trading FAQ', expandable: false },
              { num: 10, question: 'P2P user transaction policy', expandable: false },
            ].map(faq => (
              <div
                key={faq.num}
                className={`flex items-center justify-between py-5 cursor-pointer transition ${dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-7 h-7 rounded flex items-center justify-center text-sm ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {faq.num}
                  </span>
                  <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{faq.question}</span>
                </div>
                {faq.expandable ? (
                  <svg className={`w-5 h-5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </main>

      {/* Currency Selection Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-900 w-full max-w-md h-[85vh] sm:h-[600px] sm:rounded-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Select Currency</h2>
                <button
                  onClick={() => setShowCurrencyModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="Search currency"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>

              {/* Recent Currencies */}
              <div className="flex gap-2 mt-3">
                {recentCurrencies.map(code => {
                  const curr = CURRENCIES.find(c => c.code === code)
                  return (
                    <button
                      key={code}
                      onClick={() => handleSelectCurrency(code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700 transition"
                    >
                      {curr && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: curr.color }}
                        >
                          {curr.symbol.slice(0, 1)}
                        </span>
                      )}
                      {code}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Currency List */}
            <div className="flex-1 overflow-hidden flex">
              <div ref={listRef} className="flex-1 overflow-y-auto">
                {/* Default Section */}
                <div className="px-4 py-2">
                  <p className="text-gray-500 text-sm mb-2">Default</p>
                  {CURRENCIES.filter(c => c.code === 'USD').map(currency => (
                    <button
                      key={currency.code}
                      onClick={() => handleSelectCurrency(currency.code)}
                      className="w-full flex items-center gap-3 py-3 hover:bg-gray-800 rounded-lg transition"
                    >
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: currency.color }}
                      >
                        {currency.symbol.slice(0, 2)}
                      </span>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{currency.code}</p>
                        <p className="text-gray-500 text-sm">{currency.name}</p>
                      </div>
                      {selectedFiat === currency.code && (
                        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                {/* Available Currencies */}
                <div className="px-4 py-2">
                  <p className="text-gray-500 text-sm mb-2 flex items-center gap-1">
                    All currencies
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </p>

                  {Object.entries(groupedCurrencies).map(([letter, currencies]) => (
                    <div key={letter} id={`currency-${letter}`}>
                      {currencies.map(currency => (
                        <button
                          key={currency.code}
                          onClick={() => handleSelectCurrency(currency.code)}
                          className="w-full flex items-center gap-3 py-3 hover:bg-gray-800 rounded-lg transition"
                        >
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: currency.color }}
                          >
                            {currency.symbol.slice(0, 2)}
                          </span>
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium">{currency.code}</p>
                            <p className="text-gray-500 text-sm">{currency.name}</p>
                          </div>
                          {selectedFiat === currency.code && (
                            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Alphabet Sidebar */}
              <div className="w-6 flex flex-col items-center justify-center py-2 text-[10px] text-gray-500">
                {ALPHABET.map(letter => (
                  <button
                    key={letter}
                    onClick={() => scrollToLetter(letter)}
                    className="hover:text-orange-500 transition py-0.5"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Selection Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-900 w-full max-w-md sm:rounded-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Select Asset</h2>
                <button
                  onClick={() => setShowCryptoModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={cryptoSearch}
                  onChange={(e) => setCryptoSearch(e.target.value)}
                  placeholder="Search asset"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>

              {/* Recent/Popular */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {recentCryptos.map(code => {
                  const crypto = CRYPTO_ASSETS.find(c => c.code === code)
                  return (
                    <button
                      key={code}
                      onClick={() => handleSelectCrypto(code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition ${
                        selectedAsset === code
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                      }`}
                    >
                      {crypto && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: crypto.color }}
                        >
                          {crypto.icon}
                        </span>
                      )}
                      {code}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Crypto List */}
            <div className="max-h-[400px] overflow-y-auto px-4 py-2">
              <p className="text-gray-500 text-sm mb-2">All assets</p>
              {filteredCryptos.map(crypto => (
                <button
                  key={crypto.code}
                  onClick={() => handleSelectCrypto(crypto.code)}
                  className="w-full flex items-center gap-3 py-3 hover:bg-gray-800 rounded-lg transition"
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: crypto.color }}
                  >
                    {crypto.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{crypto.code}</p>
                    <p className="text-gray-500 text-sm">{crypto.name}</p>
                  </div>
                  {selectedAsset === crypto.code && (
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-900 w-full max-w-md sm:rounded-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Pay With</h2>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Payment Methods Grid */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {/* All Option */}
                <button
                  onClick={() => {
                    setSelectedPayments([])
                    setSelectedPayment('')
                  }}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
                    selectedPayments.length === 0
                      ? 'bg-gray-700 border-gray-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  All
                </button>

                {/* Payment Methods */}
                {filteredPaymentMethods.map(method => (
                  <button
                    key={method}
                    onClick={() => handleTogglePayment(method)}
                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition text-left relative ${
                      selectedPayments.includes(method)
                        ? 'bg-gray-700 border-orange-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {method}
                    {selectedPayments.includes(method) && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={handleResetPayments}
                className="flex-1 py-3 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition"
              >
                Reset
              </button>
              <button
                onClick={handleConfirmPayments}
                className="flex-1 py-3 rounded-lg bg-yellow-500 text-gray-900 font-medium hover:bg-yellow-400 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amount Filter Modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-gray-900 w-full max-w-md sm:rounded-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Filter by Amount</h2>
                <button
                  onClick={() => setShowAmountModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="p-4">
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <input
                  type="text"
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  className="w-full text-4xl font-bold bg-transparent text-white text-center focus:outline-none"
                />
                <p className="text-center text-gray-500 mt-2">{selectedFiat}</p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: `${getCurrencyPrefix(selectedFiat)}3K`, value: '3000' },
                  { label: `${getCurrencyPrefix(selectedFiat)}20K`, value: '20000' },
                  { label: `${getCurrencyPrefix(selectedFiat)}80K`, value: '80000' },
                  { label: `${getCurrencyPrefix(selectedFiat)}200K`, value: '200000' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setAmountFilter(value)}
                    className={`py-3 rounded-lg border text-sm font-medium transition ${
                      amountFilter === value
                        ? 'bg-gray-700 border-orange-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setAmountFilter('')
                  setShowAmountModal(false)
                }}
                className="flex-1 py-3 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition"
              >
                Reset
              </button>
              <button
                onClick={() => setShowAmountModal(false)}
                className="flex-1 py-3 rounded-lg bg-yellow-500 text-gray-900 font-medium hover:bg-yellow-400 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Customer Service Button */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
        title="Customer Service"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Community */}
            <div>
              <h3 className="text-white font-semibold mb-4">Community</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
              <div className="space-y-2">
                <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" /></svg>
                  English
                </button>
                <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                  USD-$
                </button>
              </div>
            </div>

            {/* About Us */}
            <div>
              <h3 className="text-white font-semibold mb-4">About Us</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-orange-500">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">News</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Press</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Legal</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Privacy</a></li>
              </ul>
            </div>

            {/* Products */}
            <div>
              <h3 className="text-white font-semibold mb-4">Products</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Exchange</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Buy Crypto</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">P2P Trading</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Crypto Payments</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Gift Card</a></li>
              </ul>
            </div>

            {/* Business */}
            <div>
              <h3 className="text-white font-semibold mb-4">Business</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-orange-500">P2P Merchant</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Institutional</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Labs</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-orange-500">24/7 Chat Support</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Support Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Fees</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">APIs</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-500">Trading Rules</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <p className="text-gray-500 text-xs">
              CyxTrade is a globally permissionless P2P fiat exchange protocol. Virtual asset prices can be volatile.
              The value of your investment may go down or up and you may not get back the amount invested.
              You are solely responsible for your investment decisions.
            </p>
            <p className="text-gray-600 text-xs mt-4">© 2024-2026 CyxTrade. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
