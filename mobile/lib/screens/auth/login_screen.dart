import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/error_utils.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _showRecovery = false;
  bool _hasExistingIdentity = false;
  bool _checkingIdentity = true;
  final _privateKeyController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkExistingIdentity();
  }

  Future<void> _checkExistingIdentity() async {
    final hasIdentity = await context.read<AuthProvider>().hasStoredIdentity();
    if (mounted) {
      setState(() {
        _hasExistingIdentity = hasIdentity;
        _checkingIdentity = false;
      });
    }
  }

  @override
  void dispose() {
    _privateKeyController.dispose();
    super.dispose();
  }

  Future<void> _loginWithKeypair() async {
    try {
      await context.read<AuthProvider>().loginWithKeypair();
      if (mounted) {
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _loginWithKeypair);
      }
    }
  }

  Future<void> _importPrivateKey() async {
    final privateKey = _privateKeyController.text.trim().toLowerCase();
    if (privateKey.length != 64) {
      showErrorSnackBar(context, 'Invalid backup key. Expected 64 characters.');
      return;
    }

    try {
      await context.read<AuthProvider>().importFromPrivateKey(privateKey);
      if (mounted) {
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _importPrivateKey);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (_checkingIdentity) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              // Logo
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.currency_exchange,
                  size: 40,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                _hasExistingIdentity ? 'Welcome Back' : 'Get Started',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _hasExistingIdentity
                    ? 'Your identity is stored on this device'
                    : 'Your identity is generated on your device.\nNo phone or email needed.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey,
                ),
              ),

              if (!_showRecovery) ...[
                const SizedBox(height: 32),
                // Anonymous identity notice
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.lock_outline,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Anonymous Identity',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Your keypair identity is generated and stored locally. We never collect personal information.',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey[700],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _loginWithKeypair,
                  child: auth.isLoading
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            SizedBox(width: 12),
                            Text('Creating identity...'),
                          ],
                        )
                      : Text(_hasExistingIdentity ? 'Continue' : 'Get Started'),
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => setState(() => _showRecovery = true),
                  child: const Text('Recover Existing Account'),
                ),
              ] else ...[
                const SizedBox(height: 32),
                Text(
                  'Enter your backup key to recover your identity',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _privateKeyController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Backup Key',
                    hintText: 'Enter your 64-character backup key...',
                    border: OutlineInputBorder(),
                  ),
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This is the key you backed up when first using CyxTrade',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _importPrivateKey,
                  child: auth.isLoading
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            SizedBox(width: 12),
                            Text('Recovering...'),
                          ],
                        )
                      : const Text('Recover Account'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _showRecovery = false;
                      _privateKeyController.clear();
                    });
                  },
                  child: const Text('Back to login'),
                ),
              ],

              const Spacer(flex: 2),
              Text(
                'By continuing, you agree to our Terms of Service',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
