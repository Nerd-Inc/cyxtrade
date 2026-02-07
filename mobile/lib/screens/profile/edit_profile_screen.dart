import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../utils/error_utils.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _displayNameController;
  bool _isSaving = false;
  bool _isUploadingAvatar = false;
  String? _avatarUrl;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _displayNameController = TextEditingController(
      text: user?['displayName'] ?? '',
    );
    _avatarUrl = user?['avatarUrl'];
  }

  Future<void> _pickAndUploadAvatar() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 80,
      );

      if (image == null) return;

      setState(() => _isUploadingAvatar = true);

      final newAvatarUrl = await ApiService().uploadAvatar(File(image.path));

      setState(() {
        _avatarUrl = newAvatarUrl;
        _isUploadingAvatar = false;
      });

      // Update local auth state
      if (mounted) {
        context.read<AuthProvider>().updateUser({'avatarUrl': newAvatarUrl});
        showSuccessSnackBar(context, 'Avatar updated');
      }
    } catch (e) {
      setState(() => _isUploadingAvatar = false);
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _pickAndUploadAvatar);
      }
    }
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      await ApiService().updateProfile({
        'displayName': _displayNameController.text.trim(),
      });

      // Update local state
      if (mounted) {
        context.read<AuthProvider>().updateUser({
          'displayName': _displayNameController.text.trim(),
        });

        showSuccessSnackBar(context, 'Profile updated successfully');
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, e, onRetry: _saveProfile);
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveProfile,
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Avatar
              Center(
                child: Stack(
                  children: [
                    if (_isUploadingAvatar)
                      const CircleAvatar(
                        radius: 50,
                        child: CircularProgressIndicator(),
                      )
                    else if (_avatarUrl != null && _avatarUrl!.isNotEmpty)
                      CircleAvatar(
                        radius: 50,
                        backgroundImage: NetworkImage(_avatarUrl!),
                      )
                    else
                      CircleAvatar(
                        radius: 50,
                        backgroundColor: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                        child: Text(
                          (_displayNameController.text.isNotEmpty
                                  ? _displayNameController.text[0]
                                  : '?')
                              .toUpperCase(),
                          style: TextStyle(
                            fontSize: 36,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                      ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: CircleAvatar(
                        radius: 18,
                        backgroundColor: Theme.of(context).primaryColor,
                        child: IconButton(
                          icon: const Icon(Icons.camera_alt, size: 18),
                          color: Colors.white,
                          onPressed: _isUploadingAvatar ? null : _pickAndUploadAvatar,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Display name
              TextFormField(
                controller: _displayNameController,
                decoration: const InputDecoration(
                  labelText: 'Display Name',
                  hintText: 'Enter your name',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                ),
                textCapitalization: TextCapitalization.words,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter your name';
                  }
                  if (value.trim().length < 2) {
                    return 'Name must be at least 2 characters';
                  }
                  return null;
                },
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),

              // Phone (read-only)
              TextFormField(
                initialValue: user?['phone'] ?? '',
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone_outlined),
                  border: OutlineInputBorder(),
                ),
                enabled: false,
              ),
              const SizedBox(height: 8),
              Text(
                'Phone number cannot be changed',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
