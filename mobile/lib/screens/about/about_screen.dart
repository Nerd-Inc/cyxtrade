import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('About CyxTrade'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        children: [
          // Logo and tagline
          Container(
            padding: const EdgeInsets.all(32),
            color: Theme.of(context).primaryColor.withOpacity(0.05),
            child: Column(
              children: [
                Image.asset(
                  'assets/images/logo.png',
                  height: 80,
                  errorBuilder: (_, __, ___) => Icon(
                    Icons.currency_exchange,
                    size: 64,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'CyxTrade',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'P2P Fiat Exchange for Trusted Networks',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  'Version 0.1.0',
                  style: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          // Quick stats
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _StatCard(
                  icon: Icons.percent,
                  value: '2-3%',
                  label: 'Avg. Fees',
                ),
                _StatCard(
                  icon: Icons.timer,
                  value: '30 min',
                  label: 'Avg. Time',
                ),
                _StatCard(
                  icon: Icons.shield,
                  value: '100%',
                  label: 'Protected',
                ),
              ],
            ),
          ),

          const Divider(),

          // Sections
          _SectionHeader(title: 'ABOUT'),
          _InfoTile(
            icon: Icons.info_outline,
            title: 'What is CyxTrade?',
            onTap: () => _showInfoSheet(context, _aboutContent),
          ),
          _InfoTile(
            icon: Icons.swap_horiz,
            title: 'How It Works',
            onTap: () => _showInfoSheet(context, _howItWorksContent),
          ),
          _InfoTile(
            icon: Icons.shield_outlined,
            title: 'Security & Bonds',
            onTap: () => _showInfoSheet(context, _securityContent),
          ),

          const Divider(),

          _SectionHeader(title: 'FAQ'),
          _InfoTile(
            icon: Icons.help_outline,
            title: 'Frequently Asked Questions',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const FAQScreen()),
            ),
          ),

          const Divider(),

          _SectionHeader(title: 'LEGAL'),
          _InfoTile(
            icon: Icons.description_outlined,
            title: 'Terms of Service',
            onTap: () => _showInfoSheet(context, _termsContent),
          ),
          _InfoTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Policy',
            onTap: () => _showInfoSheet(context, _privacyContent),
          ),

          const Divider(),

          _SectionHeader(title: 'CONNECT'),
          _InfoTile(
            icon: Icons.language,
            title: 'Website',
            subtitle: 'cyxtrade.com',
            onTap: () => _launchUrl('https://cyxtrade.com'),
          ),
          _InfoTile(
            icon: Icons.email_outlined,
            title: 'Contact Support',
            subtitle: 'support@cyxtrade.com',
            onTap: () => _launchUrl('mailto:support@cyxtrade.com'),
          ),
          _InfoTile(
            icon: Icons.code,
            title: 'GitHub',
            subtitle: 'Open Source',
            onTap: () => _launchUrl('https://github.com/Nerd-Inc/cyxtrade'),
          ),

          const SizedBox(height: 32),

          // Footer
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text(
                  'Made with love for the diaspora',
                  style: TextStyle(
                    color: Colors.grey.shade500,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '2024 CyxTrade. All rights reserved.',
                  style: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showInfoSheet(BuildContext context, Map<String, String> content) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                content['title']!,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(height: 24),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                child: Text(
                  content['body']!,
                  style: const TextStyle(height: 1.6),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(icon, color: Theme.of(context).primaryColor),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.grey.shade600,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const _InfoTile({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }
}

// Content maps
const _aboutContent = {
  'title': 'What is CyxTrade?',
  'body': '''CyxTrade is a peer-to-peer (P2P) fiat exchange platform designed for trusted networks.

THE PROBLEM WE SOLVE

Every year, migrant workers send \$717 billion home to their families. But \$48 billion is lost to fees - that's 6.7% on average, and up to 15% on some corridors like UAE to Cameroon.

For a construction worker earning \$800/month and sending \$500 home, that's \$600-900 lost per year just in fees.

OUR SOLUTION

CyxTrade connects people who want to exchange currencies directly, without expensive middlemen.

How it works:
1. You want to send AED to someone in Cameroon
2. A local trader accepts your AED
3. Their partner in Cameroon sends XAF to your recipient
4. Everyone saves money

KEY FEATURES

- Low fees: Only 2-3% spread (vs 10-15% at Western Union)
- Fast: Most transfers complete in 30-45 minutes
- Secure: Traders post security bonds that protect you
- Simple: No complex crypto knowledge needed

WHO IT'S FOR

- Diaspora workers sending money home
- Families receiving international transfers
- Small traders digitizing their exchange business
- Anyone tired of paying excessive remittance fees

SUPPORTED CORRIDORS

Currently: UAE (AED) to Cameroon (XAF)
Coming soon: More African and Middle Eastern corridors

CyxTrade - Send money anywhere, without the fees.''',
};

const _howItWorksContent = {
  'title': 'How It Works',
  'body': '''CyxTrade connects you with trusted traders who facilitate your transfers.

STEP 1: ENTER AMOUNT

Open the app and enter how much you want to send. You'll see the estimated amount your recipient will receive.

STEP 2: ADD RECIPIENT

Enter your recipient's details:
- Their name
- Phone number or account
- Preferred payment method (Orange Money, MTN, Bank)

STEP 3: SELECT A TRADER

Browse available traders and compare:
- Exchange rates
- Rating and reviews
- Available capacity

Choose the trader that works best for you.

STEP 4: CONFIRM & PAY

Review all details and confirm. You'll receive the trader's payment details (bank account, mobile money number).

Transfer your money directly to the trader.

STEP 5: TRADER DELIVERS

Once the trader confirms your payment, they instruct their partner to pay your recipient.

Your recipient gets the money via their preferred method.

STEP 6: COMPLETE

Both parties confirm the transfer is complete. Rate your experience to help future users.

TYPICAL TIMELINE

- Simple transfer: 30-45 minutes
- Bank to bank: 1-2 hours
- First-time users: May take longer for verification

TIPS FOR SUCCESS

- Double-check recipient details before confirming
- Only pay from your registered payment method
- Keep payment receipts/screenshots
- Respond promptly to trader messages
- Rate your trader after completion''',
};

const _securityContent = {
  'title': 'Security & Bonds',
  'body': '''Your security is our priority. Here's how CyxTrade protects your money.

SECURITY BONDS

Every trader must deposit a security bond before they can trade. This bond:

- Protects you if something goes wrong
- Limits how much a trader can handle
- Gets forfeited to you if a trader scams

If a trader fails to complete their part, their bond compensates you.

TRADE LIMITS

Traders can only handle trades up to their bond amount:
- \$500 bond = max \$500 trade
- \$1,000 bond = max \$1,000 trade

This ensures there's always protection for your transfer.

PAYMENT RULES

To prevent fraud, we follow strict payment rules:

1. Only pay from YOUR account
   - Don't let friends pay for you
   - Don't use someone else's card

2. Verify before confirming
   - Traders verify payment source
   - Third-party payments are rejected

3. Time limits
   - Pay within 2 hours of accepting trade
   - Traders must deliver within 2 hours
   - Timeouts trigger automatic disputes

DISPUTE RESOLUTION

If something goes wrong:

1. Evidence-based: Both parties submit proof
2. Fair review: Neutral reviewers examine the case
3. Swift resolution: Most disputes resolved in 24-48 hours
4. Compensation: Guilty party's bond goes to victim

WHAT WE CAN'T PROTECT AGAINST

- Paying to wrong recipient (double-check details!)
- Sharing your login credentials
- Confirming before your recipient actually receives money

BEST PRACTICES

- Keep screenshots of all payments
- Don't share sensitive information in chat
- Verify recipient got the money before confirming
- Report suspicious activity immediately''',
};

const _termsContent = {
  'title': 'Terms of Service',
  'body': '''CYXTRADE TERMS OF SERVICE

Last updated: February 2024

1. ACCEPTANCE OF TERMS

By using CyxTrade, you agree to these terms. If you don't agree, please don't use the app.

2. ELIGIBILITY

You must be:
- At least 18 years old
- Capable of entering binding contracts
- Not prohibited from using our services by law

3. ACCOUNT RESPONSIBILITIES

You are responsible for:
- Keeping your account secure
- All activities under your account
- Providing accurate information
- Not sharing your credentials

4. TRADING RULES

When trading, you must:
- Only use your own payment methods
- Not engage in fraudulent activity
- Complete trades within time limits
- Provide accurate payment information

5. PROHIBITED ACTIVITIES

You may not:
- Use the platform for illegal activities
- Attempt to defraud other users
- Create multiple accounts
- Manipulate the rating system
- Use the platform for money laundering

6. BONDS AND LIMITS

- Traders must maintain adequate bonds
- Trade limits are based on bonds and reputation
- Bonds may be forfeited in case of fraud

7. DISPUTES

- Disputes are resolved based on evidence
- Our decision is final and binding
- False claims may result in penalties

8. LIMITATION OF LIABILITY

CyxTrade is not responsible for:
- Losses due to user error
- Third-party payment processor issues
- Fiat currency fluctuations
- Acts beyond our reasonable control

9. TERMINATION

We may terminate accounts for:
- Violation of these terms
- Fraudulent activity
- Abuse of other users

10. CHANGES TO TERMS

We may update these terms. Continued use means acceptance.

For questions: legal@cyxtrade.com''',
};

const _privacyContent = {
  'title': 'Privacy Policy',
  'body': '''CYXTRADE PRIVACY POLICY

Last updated: February 2024

1. INFORMATION WE COLLECT

Account Information:
- Phone number (for login)
- Display name (optional)
- Payment methods you add

Transaction Information:
- Trade history
- Payment confirmations
- Chat messages with traders

Device Information:
- Device type and OS
- App version
- General location (country)

2. HOW WE USE INFORMATION

We use your information to:
- Provide our services
- Verify transactions
- Resolve disputes
- Improve the platform
- Send important notifications

3. INFORMATION SHARING

We share information with:
- Trading counterparties (necessary for trades)
- Dispute reviewers (when disputes arise)
- Law enforcement (only when legally required)

We DO NOT:
- Sell your data
- Share with advertisers
- Use for unrelated purposes

4. DATA SECURITY

We protect your data with:
- Encryption in transit and at rest
- Secure authentication
- Regular security audits

5. DATA RETENTION

We keep your data:
- Account info: While account is active
- Transaction history: 3 years
- Chat messages: 1 year

6. YOUR RIGHTS

You can:
- Access your data
- Correct inaccurate data
- Delete your account
- Export your transaction history

7. COOKIES AND TRACKING

We use minimal tracking:
- Session cookies for login
- Analytics to improve the app
- No advertising trackers

8. CHILDREN'S PRIVACY

CyxTrade is not for anyone under 18.

9. INTERNATIONAL TRANSFERS

Your data may be processed in different countries where we operate.

10. CONTACT US

Privacy questions: privacy@cyxtrade.com

11. CHANGES

We'll notify you of significant privacy policy changes.''',
};

// FAQ Screen
class FAQScreen extends StatelessWidget {
  const FAQScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FAQ'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _FAQItem(
            question: 'What is CyxTrade?',
            answer: 'CyxTrade is a peer-to-peer fiat exchange platform that helps you send money internationally at lower costs. Instead of using expensive remittance services, you connect directly with local traders who facilitate your transfer.',
          ),
          _FAQItem(
            question: 'How much does it cost?',
            answer: 'CyxTrade charges no platform fees. You only pay the trader\'s spread (the difference between buy and sell rates), which is typically 2-3%. Compare this to Western Union\'s 10-15% fees on African corridors.',
          ),
          _FAQItem(
            question: 'How long does a transfer take?',
            answer: 'Most transfers complete in 30-45 minutes. Bank transfers may take 1-2 hours. First-time transfers might take a bit longer as you get familiar with the process.',
          ),
          _FAQItem(
            question: 'Is my money safe?',
            answer: 'Yes. Every trader must post a security bond before trading. If a trader fails to complete their part of the deal, their bond is forfeited to compensate you. Trade limits are tied to bond amounts to ensure full protection.',
          ),
          _FAQItem(
            question: 'What is a security bond?',
            answer: 'A security bond is money that traders deposit before they can accept trades. It acts as insurance - if a trader scams you, their bond is given to you as compensation. This makes fraud economically irrational.',
          ),
          _FAQItem(
            question: 'Do I need to be a trader?',
            answer: 'No! Most users are just senders. You find a trader, pay them your local currency, and they arrange for your recipient to get paid. You only need to become a trader if you want to earn money by facilitating exchanges.',
          ),
          _FAQItem(
            question: 'What payment methods are supported?',
            answer: 'We support:\n\n- Bank transfers\n- Mobile money (Orange Money, MTN Mobile Money)\n- Cash pickup (in some areas)\n\nAvailable methods depend on your country and the trader you choose.',
          ),
          _FAQItem(
            question: 'What if something goes wrong?',
            answer: 'If there\'s a problem with your trade:\n\n1. First, try to resolve it via chat with the trader\n2. If that fails, raise a dispute with evidence\n3. Our dispute team reviews the case within 24-48 hours\n4. If the trader is at fault, their bond compensates you',
          ),
          _FAQItem(
            question: 'Can I cancel a trade?',
            answer: 'You can cancel before the trader accepts. Once a trade is accepted and escrow is locked, cancellation requires mutual agreement or going through the dispute process.',
          ),
          _FAQItem(
            question: 'Why can\'t I use someone else\'s payment method?',
            answer: 'Third-party payments are rejected to prevent fraud. If you pay from someone else\'s account, the original owner could file a chargeback, and the trader would lose money. This rule protects everyone.',
          ),
          _FAQItem(
            question: 'How do I become a trader?',
            answer: 'To become a trader:\n\n1. Go to Profile > Become a Trader\n2. Deposit your security bond (minimum 500 AED)\n3. Set your exchange rates\n4. Start accepting trade requests\n\nYou earn the spread on each trade you complete.',
          ),
          _FAQItem(
            question: 'What currencies are supported?',
            answer: 'Currently we support:\n\n- AED (UAE Dirham)\n- XAF (Central African CFA Franc)\n\nMore currencies coming soon including USD, EUR, NGN, and GBP.',
          ),
          _FAQItem(
            question: 'Is CyxTrade legal?',
            answer: 'CyxTrade facilitates peer-to-peer currency exchange. Users are responsible for complying with their local laws. We recommend consulting local regulations if you\'re unsure.',
          ),
          _FAQItem(
            question: 'How do I contact support?',
            answer: 'You can reach us at:\n\n- Email: support@cyxtrade.com\n- In-app: Settings > Help & Support\n\nWe typically respond within 24 hours.',
          ),
          _FAQItem(
            question: 'What makes CyxTrade different from Binance P2P?',
            answer: 'Unlike Binance P2P:\n\n- No KYC required for basic use\n- Focused on fiat-to-fiat (not crypto)\n- Designed for underserved corridors\n- Trader bonds instead of centralized escrow\n- Community-driven trust model',
          ),
        ],
      ),
    );
  }
}

class _FAQItem extends StatefulWidget {
  final String question;
  final String answer;

  const _FAQItem({
    required this.question,
    required this.answer,
  });

  @override
  State<_FAQItem> createState() => _FAQItemState();
}

class _FAQItemState extends State<_FAQItem> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => setState(() => _expanded = !_expanded),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.question,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    color: Colors.grey,
                  ),
                ],
              ),
              if (_expanded) ...[
                const SizedBox(height: 12),
                Text(
                  widget.answer,
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
