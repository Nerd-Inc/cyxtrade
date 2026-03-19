import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useAdsStore, useWalletStore, type P2PAd } from '../store/pro'

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
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])

  // Amount filter
  const [showAmountModal, setShowAmountModal] = useState(false)
  const [amountFilter, setAmountFilter] = useState('')

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/app" className="flex items-center space-x-2">
                <img src="/logo.png" alt="CyxTrade" className="h-8 w-8" />
                <span className="text-xl font-bold text-teal-600">CyxTrade</span>
              </Link>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded">
                PRO
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/pro" className="text-teal-600 font-medium">P2P</Link>
              <Link to="/pro/orders" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Orders</Link>
              <Link to="/pro/wallet" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Wallet</Link>
              <Link to="/pro/post-ad" className="text-gray-600 dark:text-gray-400 hover:text-teal-600">Post Ad</Link>
            </nav>

            <div className="flex items-center gap-3">
              {/* Currency Selector Button */}
              <button
                onClick={() => setShowCurrencyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition"
              >
                <span className="font-medium">{selectedFiat}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <Link to="/app" className="hidden sm:block text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm">
                Basic
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
              >
                {isLoggingOut ? '...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex gap-4 overflow-x-auto">
        <Link to="/pro" className="text-teal-600 font-medium whitespace-nowrap">P2P</Link>
        <Link to="/pro/orders" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Orders</Link>
        <Link to="/pro/wallet" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Wallet</Link>
        <Link to="/pro/post-ad" className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Post Ad</Link>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Balance Banner */}
        {userBalance && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm">Available {selectedAsset}</p>
                <p className="text-2xl font-bold">{userBalance.available.toFixed(4)}</p>
                <p className="text-teal-100 text-xs">Locked: {userBalance.locked.toFixed(4)}</p>
              </div>
              <Link
                to="/pro/wallet"
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Manage Wallet
              </Link>
            </div>
          </div>
        )}

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTradeType('buy')}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              tradeType === 'buy'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              tradeType === 'sell'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Crypto Selector Button */}
            <button
              onClick={() => setShowCryptoModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {selectedCryptoData && (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: selectedCryptoData.color }}
                >
                  {selectedCryptoData.icon}
                </span>
              )}
              <span className="font-semibold text-gray-900 dark:text-white">{selectedAsset}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Currency Selector Button */}
            <button
              onClick={() => setShowCurrencyModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {selectedCurrencyData && (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: selectedCurrencyData.color }}
                >
                  {selectedCurrencyData.symbol.slice(0, 2)}
                </span>
              )}
              <span className="font-semibold text-gray-900 dark:text-white">{selectedFiat}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Amount Filter */}
            <button
              onClick={() => setShowAmountModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                {amountFilter || 'Amount'}
              </span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Payment Method Selector */}
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedPayment || 'Payment'}
              </span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Filter Icon */}
            <button
              onClick={() => fetchAds({ type: tradeType, asset: selectedAsset, fiatCurrency: selectedFiat || undefined, paymentMethod: selectedPayment || undefined })}
              className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              title="Filter"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Ads List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No ads found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters</p>
            <Link
              to="/pro/post-ad"
              className="inline-block mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition"
            >
              Post an Ad
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map(ad => (
              <div
                key={ad.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-teal-500 transition cursor-pointer"
                onClick={() => handleTradeClick(ad)}
              >
                {/* Top Row: Trader Info + Payment Methods */}
                <div className="flex items-start justify-between gap-4">
                  {/* Trader Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-lg font-bold text-white">
                        {ad.traderName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{ad.traderName || 'Anonymous'}</p>
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="underline decoration-dotted">{ad.completedCount} Trades ({(ad.completionRate * 100).toFixed(1)}%)</span>
                        <span className="text-gray-400">|</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          {(ad.completionRate * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods with colored dots */}
                  <div className="text-right space-y-1">
                    {ad.paymentMethods.slice(0, 4).map(method => (
                      <div key={method} className="flex items-center justify-end gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <span className="truncate max-w-[120px]">{method}</span>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getPaymentColor(method) }}
                        ></span>
                      </div>
                    ))}
                    {ad.paymentMethods.length > 4 && (
                      <div className="text-xs text-gray-500">+{ad.paymentMethods.length - 4} more</div>
                    )}
                  </div>
                </div>

                {/* Price Row */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      <span className="text-base font-normal text-gray-500 mr-1">{getCurrencyPrefix(ad.fiatCurrency)}</span>
                      {ad.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-sm font-normal text-gray-500 ml-1">/{ad.asset}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>Limit <span className="text-gray-900 dark:text-white font-medium">{ad.minAmount.toLocaleString()} - {ad.maxAmount.toLocaleString()} {ad.fiatCurrency}</span></span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Available <span className="text-gray-900 dark:text-white font-medium">{ad.availableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ad.asset}</span>
                    </div>
                  </div>

                  {/* Time + Button */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>15 min</span>
                    </div>
                    <button
                      className={`px-8 py-2 rounded-lg font-medium text-sm ${
                        tradeType === 'buy'
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTradeClick(ad)
                      }}
                    >
                      {tradeType === 'buy' ? 'Buy' : 'Sell'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
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
                        <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
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
                            <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
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
                    className="hover:text-teal-500 transition py-0.5"
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
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
                          ? 'bg-teal-600 border-teal-600 text-white'
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
                    <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
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
                        ? 'bg-gray-700 border-teal-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {method}
                    {selectedPayments.includes(method) && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
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
                        ? 'bg-gray-700 border-teal-500 text-white'
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
    </div>
  )
}
