import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../providers/trader_provider.dart';
import '../../services/api_service.dart';
import '../../utils/error_utils.dart';

class VerifyPaymentMethodScreen extends StatefulWidget {
  final String methodId;

  const VerifyPaymentMethodScreen({super.key, required this.methodId});

  @override
  State<VerifyPaymentMethodScreen> createState() => _VerifyPaymentMethodScreenState();
}

class _VerifyPaymentMethodScreenState extends State<VerifyPaymentMethodScreen> {
  bool _isInitiating = false;
  bool _isSubmitting = false;
  VerificationResult? _verification;
  File? _proofImage;
  Timer? _countdownTimer;
  Duration _timeRemaining = Duration.zero;

  final _imagePicker = ImagePicker();
  final _api = ApiService();

  @override
  void initState() {
    super.initState();
    _initializeVerification();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _initializeVerification() async {
    final provider = context.read<TraderProvider>();
    final method = provider.getPaymentMethod(widget.methodId);

    // If already pending, just show the countdown
    if (method != null && method.isPending && method.verificationCode != null) {
      _verification = VerificationResult(
        code: method.verificationCode!,
        amount: method.methodType == 'mobile_money' ? 50 : 100,
        instructions: _buildInstructions(method),
        expiresAt: method.verificationExpiresAt ?? DateTime.now().add(const Duration(hours: 24)),
      );
      _startCountdown();
      return;
    }

    // Initiate new verification
    setState(() => _isInitiating = true);

    try {
      _verification = await provider.initiateVerification(widget.methodId);
      _startCountdown();
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e);
      }
    } finally {
      if (mounted) {
        setState(() => _isInitiating = false);
      }
    }
  }

  String _buildInstructions(PaymentMethod method) {
    final amount = method.methodType == 'mobile_money' ? 50 : 100;
    final account = method.phoneNumber ?? method.accountNumber ?? 'this account';
    return '''
1. Send $amount XAF from $account to any other account
2. Include "${method.verificationCode}" in the payment reference/description
3. Take a screenshot showing the transaction
4. Upload the screenshot to complete verification
''';
  }

  void _startCountdown() {
    if (_verification == null) return;

    _updateTimeRemaining();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateTimeRemaining();
    });
  }

  void _updateTimeRemaining() {
    if (_verification == null) return;

    final remaining = _verification!.expiresAt.difference(DateTime.now());
    if (remaining.isNegative) {
      _countdownTimer?.cancel();
      setState(() => _timeRemaining = Duration.zero);
    } else {
      setState(() => _timeRemaining = remaining);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() => _proofImage = File(image.path));
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Failed to pick image: $e');
      }
    }
  }

  Future<void> _submitProof() async {
    if (_proofImage == null) {
      showErrorSnackBar(context, 'Please upload a screenshot of your transaction');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Upload image first
      final proofUrl = await _api.uploadPaymentProof(widget.methodId, _proofImage!);

      if (!mounted) return;

      // Submit verification proof
      await context.read<TraderProvider>().submitVerificationProof(widget.methodId, proofUrl);

      if (mounted) {
        showSuccessSnackBar(context, 'Payment method verified successfully!');
        context.pop(true); // Return success
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _submitProof);
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _cancelVerification() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Verification?'),
        content: const Text('Are you sure you want to cancel? You can start verification again later.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No, Continue'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      try {
        await context.read<TraderProvider>().cancelVerification(widget.methodId);
        if (mounted) {
          context.pop();
        }
      } catch (e) {
        if (mounted) {
          showErrorSnackBar(context, e);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TraderProvider>();
    final method = provider.getPaymentMethod(widget.methodId);

    if (method == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Verify Payment Method')),
        body: const Center(child: Text('Payment method not found')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Payment Method'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: _cancelVerification,
        ),
      ),
      body: _isInitiating
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Payment method info
                  _buildMethodInfo(method),
                  const SizedBox(height: 24),

                  // Verification code
                  if (_verification != null) ...[
                    _buildVerificationCode(),
                    const SizedBox(height: 24),

                    // Timer
                    _buildCountdown(),
                    const SizedBox(height: 24),

                    // Instructions
                    _buildInstructionsCard(),
                    const SizedBox(height: 24),

                    // Upload section
                    _buildUploadSection(),
                    const SizedBox(height: 32),

                    // Submit button
                    FilledButton(
                      onPressed: _isSubmitting || _proofImage == null ? null : _submitProof,
                      child: _isSubmitting
                          ? const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                                SizedBox(width: 12),
                                Text('Verifying...'),
                              ],
                            )
                          : const Text('Submit Verification'),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildMethodInfo(PaymentMethod method) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                method.methodType == 'bank' ? Icons.account_balance : Icons.phone_android,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    method.displayName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    method.maskedAccount,
                    style: TextStyle(color: Colors.grey.shade600, fontFamily: 'monospace'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationCode() {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const Text(
              'Verification Code',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _verification!.code,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    color: Theme.of(context).colorScheme.primary,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: _verification!.code));
                    showSuccessSnackBar(context, 'Code copied to clipboard');
                  },
                  tooltip: 'Copy code',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Include this code in your payment reference',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountdown() {
    final isExpired = _timeRemaining.isNegative || _timeRemaining == Duration.zero;
    final hours = _timeRemaining.inHours;
    final minutes = _timeRemaining.inMinutes.remainder(60);
    final seconds = _timeRemaining.inSeconds.remainder(60);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: isExpired ? Colors.red.shade50 : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isExpired ? Colors.red.shade200 : Colors.orange.shade200,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.timer_outlined,
            color: isExpired ? Colors.red : Colors.orange.shade700,
          ),
          const SizedBox(width: 12),
          if (isExpired)
            const Text(
              'Verification expired. Please try again.',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.w500),
            )
          else
            Text(
              'Expires in: ${hours}h ${minutes}m ${seconds}s',
              style: TextStyle(
                color: Colors.orange.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInstructionsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'Instructions',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInstructionStep(1, 'Send ${_verification!.amount} XAF',
                'From this account to any other account you own'),
            _buildInstructionStep(2, 'Include the code',
                'Add "${_verification!.code}" in the payment reference or description'),
            _buildInstructionStep(3, 'Take a screenshot',
                'Screenshot showing the transaction with the code'),
            _buildInstructionStep(4, 'Upload proof',
                'Upload the screenshot below to complete verification'),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructionStep(int step, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$step',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Upload Screenshot',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 16),
            if (_proofImage != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  children: [
                    Image.file(
                      _proofImage!,
                      width: double.infinity,
                      height: 200,
                      fit: BoxFit.cover,
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: IconButton.filled(
                        onPressed: () => setState(() => _proofImage = null),
                        icon: const Icon(Icons.close),
                        style: IconButton.styleFrom(backgroundColor: Colors.black54),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  const Expanded(child: Text('Screenshot selected')),
                  TextButton(
                    onPressed: () => _showImageSourceDialog(),
                    child: const Text('Change'),
                  ),
                ],
              ),
            ] else ...[
              InkWell(
                onTap: _showImageSourceDialog,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  height: 150,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Theme.of(context).colorScheme.outline,
                      style: BorderStyle.solid,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.add_photo_alternate_outlined,
                        size: 48,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Tap to upload screenshot',
                        style: TextStyle(color: Theme.of(context).colorScheme.primary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.cancel),
              title: const Text('Cancel'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
}
