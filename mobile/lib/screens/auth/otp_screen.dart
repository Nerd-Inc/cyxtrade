import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/error_utils.dart';

class OtpScreen extends StatefulWidget {
  final String phone;

  const OtpScreen({super.key, required this.phone});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isResending = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verifyOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final otp = _otpController.text.trim();

    try {
      await context.read<AuthProvider>().verifyOtp(widget.phone, otp);
      if (mounted) {
        final user = context.read<AuthProvider>().user;
        // Check if profile needs completion (first-time user)
        if (user?.displayName == null || user!.displayName!.isEmpty) {
          context.go('/complete-profile');
        } else {
          context.go('/home');
        }
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _verifyOtp);
      }
    }
  }

  Future<void> _resendOtp() async {
    if (_isResending) return;

    setState(() => _isResending = true);

    try {
      await context.read<AuthProvider>().requestOtp(widget.phone);
      if (mounted) {
        showSuccessSnackBar(context, 'Verification code sent');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _resendOtp);
      }
    } finally {
      if (mounted) {
        setState(() => _isResending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Enter verification code',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'We sent a code to ${widget.phone}',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.grey,
                      ),
                ),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium,
                  decoration: const InputDecoration(
                    hintText: '000000',
                    counterText: '',
                  ),
                  validator: (value) {
                    if (value == null || value.length != 6) {
                      return 'Please enter the 6-digit code';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: auth.isLoading ? null : _verifyOtp,
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Verify'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _isResending ? null : _resendOtp,
                  child: _isResending
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text("Didn't receive code? Resend"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
