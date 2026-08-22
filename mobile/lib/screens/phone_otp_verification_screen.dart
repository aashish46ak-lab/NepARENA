import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:pinput/pinput.dart';

/// NepARENA Phone Verification & OTP screen.
///
/// States: [phone] → [sending] → [otp] → [error] | [success]
///
/// Theme:
/// - Background: #0F0F11
/// - Accent (gold): #E5B800
///
/// Optional packages (pubspec.yaml):
/// ```yaml
/// dependencies:
///   flutter_animate: ^4.5.0
///   pinput: ^5.0.0
/// ```
class PhoneOtpVerificationScreen extends StatefulWidget {
  const PhoneOtpVerificationScreen({
    super.key,
    this.onVerified,
    this.onSendCode,
    this.onVerifyCode,
    this.defaultCountryCode = '+977',
    this.defaultCountryLabel = 'Nepal',
  });

  final VoidCallback? onVerified;
  final Future<bool> Function(String e164Phone)? onSendCode;
  final Future<bool> Function(String e164Phone, String code)? onVerifyCode;
  final String defaultCountryCode;
  final String defaultCountryLabel;

  @override
  State<PhoneOtpVerificationScreen> createState() =>
      _PhoneOtpVerificationScreenState();
}

enum _VerifyPhase { phone, sending, otp, success }

class _PhoneOtpVerificationScreenState extends State<PhoneOtpVerificationScreen>
    with TickerProviderStateMixin {
  static const Color _bg = Color(0xFF0F0F11);
  static const Color _gold = Color(0xFFE5B800);
  static const Color _surface = Color(0xFF1A1A1E);
  static const Color _muted = Color(0xFF8A8A93);
  static const Color _error = Color(0xFFFF4D4D);
  static const Color _success = Color(0xFF34C759);

  final _phoneController = TextEditingController();
  final _phoneFocus = FocusNode();
  final _otpController = TextEditingController();
  final _otpFocus = FocusNode();

  _VerifyPhase _phase = _VerifyPhase.phone;
  String _countryCode = '+977';
  String _countryLabel = 'Nepal';
  String? _errorMessage;
  bool _phoneFocused = false;
  bool _otpError = false;
  late final AnimationController _shakeController;

  String get _e164 {
    final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
    return '$_countryCode$digits';
  }

  @override
  void initState() {
    super.initState();
    _countryCode = widget.defaultCountryCode;
    _countryLabel = widget.defaultCountryLabel;
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 480),
    );
    _phoneFocus.addListener(() {
      setState(() => _phoneFocused = _phoneFocus.hasFocus);
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _phoneFocus.dispose();
    _otpController.dispose();
    _otpFocus.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  Future<void> _continueFromPhone() async {
    final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 10) {
      setState(() => _errorMessage = 'Enter a valid mobile number');
      return;
    }

    setState(() {
      _errorMessage = null;
      _phase = _VerifyPhase.sending;
    });

    try {
      final ok = widget.onSendCode != null
          ? await widget.onSendCode!(_e164)
          : await _mockSendCode(_e164);

      if (!mounted) return;

      if (ok) {
        setState(() {
          _phase = _VerifyPhase.otp;
          _otpError = false;
          _otpController.clear();
        });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _otpFocus.requestFocus();
        });
      } else {
        setState(() {
          _phase = _VerifyPhase.phone;
          _errorMessage = 'Could not send code. Try again.';
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _phase = _VerifyPhase.phone;
        _errorMessage = 'Network error. Try again.';
      });
    }
  }

  Future<void> _verifyOtp(String code) async {
    if (code.length != 6) return;

    setState(() {
      _otpError = false;
      _errorMessage = null;
    });

    try {
      final ok = widget.onVerifyCode != null
          ? await widget.onVerifyCode!(_e164, code)
          : await _mockVerifyCode(code);

      if (!mounted) return;

      if (ok) {
        setState(() => _phase = _VerifyPhase.success);
        widget.onVerified?.call();
      } else {
        setState(() {
          _otpError = true;
          _errorMessage = 'Wrong code. Try again.';
          _otpController.clear();
        });
        _shakeController.forward(from: 0);
        _otpFocus.requestFocus();
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _otpError = true;
        _errorMessage = 'Verification failed. Try again.';
      });
      _shakeController.forward(from: 0);
    }
  }

  Future<bool> _mockSendCode(String e164) async {
    await Future<void>.delayed(const Duration(milliseconds: 1400));
    debugPrint('[NepARENA OTP] sent to $e164');
    return true;
  }

  Future<bool> _mockVerifyCode(String code) async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    return code == '123456';
  }

  void _startOver() {
    setState(() {
      _phase = _VerifyPhase.phone;
      _errorMessage = null;
      _otpError = false;
      _otpController.clear();
      _phoneController.clear();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _phoneFocus.requestFocus();
    });
  }

  Future<void> _pickCountry() async {
    final countries = <({String code, String label, String flag})>[
      (code: '+977', label: 'Nepal', flag: '🇳🇵'),
      (code: '+91', label: 'India', flag: '🇮🇳'),
      (code: '+1', label: 'United States', flag: '🇺🇸'),
      (code: '+44', label: 'United Kingdom', flag: '🇬🇧'),
    ];

    final selected = await showModalBottomSheet<({String code, String label})>(
      context: context,
      backgroundColor: _surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Select country',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              ...countries.map(
                (c) => ListTile(
                  leading: Text(c.flag, style: const TextStyle(fontSize: 22)),
                  title: Text(c.label, style: const TextStyle(color: Colors.white)),
                  trailing: Text(c.code, style: const TextStyle(color: _muted)),
                  onTap: () => Navigator.pop(ctx, (code: c.code, label: c.label)),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );

    if (selected != null && mounted) {
      setState(() {
        _countryCode = selected.code;
        _countryLabel = selected.label;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 320),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          child: switch (_phase) {
            _VerifyPhase.phone => _PhoneInputView(
                key: const ValueKey('phone'),
                controller: _phoneController,
                focusNode: _phoneFocus,
                focused: _phoneFocused,
                countryCode: _countryCode,
                countryLabel: _countryLabel,
                errorMessage: _errorMessage,
                onPickCountry: _pickCountry,
                onContinue: _continueFromPhone,
              ),
            _VerifyPhase.sending => const _SendingView(key: ValueKey('sending')),
            _VerifyPhase.otp => _OtpView(
                key: const ValueKey('otp'),
                controller: _otpController,
                focusNode: _otpFocus,
                phoneDisplay: '$_countryCode ${_phoneController.text.trim()}',
                error: _otpError,
                errorMessage: _errorMessage,
                shake: _shakeController,
                onCompleted: _verifyOtp,
                onResend: () async {
                  setState(() => _phase = _VerifyPhase.sending);
                  await _continueFromPhone();
                },
                onEditNumber: () {
                  setState(() {
                    _phase = _VerifyPhase.phone;
                    _otpError = false;
                    _errorMessage = null;
                    _otpController.clear();
                  });
                },
              ),
            _VerifyPhase.success => _SuccessView(
                key: const ValueKey('success'),
                onStartOver: _startOver,
              ),
          },
        ),
      ),
    );
  }
}

class _PhoneInputView extends StatelessWidget {
  const _PhoneInputView({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.focused,
    required this.countryCode,
    required this.countryLabel,
    required this.errorMessage,
    required this.onPickCountry,
    required this.onContinue,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool focused;
  final String countryCode;
  final String countryLabel;
  final String? errorMessage;
  final VoidCallback onPickCountry;
  final VoidCallback onContinue;

  static const Color _bg = Color(0xFF0F0F11);
  static const Color _gold = Color(0xFFE5B800);
  static const Color _surface = Color(0xFF1A1A1E);
  static const Color _muted = Color(0xFF8A8A93);
  static const Color _error = Color(0xFFFF4D4D);

  @override
  Widget build(BuildContext context) {
    final borderColor = errorMessage != null
        ? _error
        : focused
            ? _gold
            : Colors.white12;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 48),
          const Text(
            'Verify your number',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            "We'll send a 6-digit code to confirm it's you.",
            textAlign: TextAlign.center,
            style: TextStyle(color: _muted, fontSize: 15, height: 1.35),
          ),
          const SizedBox(height: 40),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            decoration: BoxDecoration(
              color: _surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: borderColor, width: focused ? 1.5 : 1),
              boxShadow: focused
                  ? [
                      BoxShadow(
                        color: _gold.withValues(alpha: 0.28),
                        blurRadius: 18,
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                InkWell(
                  onTap: onPickCountry,
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 16, 10, 16),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          countryCode,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.keyboard_arrow_down_rounded,
                          color: _muted,
                          size: 20,
                        ),
                      ],
                    ),
                  ),
                ),
                Container(width: 1, height: 28, color: Colors.white12),
                Expanded(
                  child: TextField(
                    controller: controller,
                    focusNode: focusNode,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w500,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    decoration: const InputDecoration(
                      hintText: '98XXXXXXXX',
                      hintStyle: TextStyle(color: _muted, fontWeight: FontWeight.w400),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 16,
                      ),
                    ),
                    onSubmitted: (_) => onContinue(),
                  ),
                ),
              ],
            ),
          ),
          if (errorMessage != null) ...[
            const SizedBox(height: 10),
            Text(
              errorMessage!,
              style: const TextStyle(color: _error, fontSize: 13),
            ),
          ],
          const Spacer(),
          SizedBox(
            height: 54,
            child: FilledButton(
              onPressed: onContinue,
              style: FilledButton.styleFrom(
                backgroundColor: _gold,
                foregroundColor: _bg,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Continue',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 280.ms)
        .slideY(begin: 0.04, end: 0, curve: Curves.easeOutCubic);
  }
}

class _SendingView extends StatelessWidget {
  const _SendingView({super.key});

  static const Color _muted = Color(0xFF8A8A93);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const _BouncingDots(),
          const SizedBox(height: 20),
          const Text(
            'Sending code...',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Hang tight',
            style: TextStyle(color: _muted, fontSize: 13),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}

class _BouncingDots extends StatefulWidget {
  const _BouncingDots();

  @override
  State<_BouncingDots> createState() => _BouncingDotsState();
}

class _BouncingDotsState extends State<_BouncingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  static const _colors = [
    Color(0xFFE5B800),
    Color(0xFFF0C933),
    Color(0xFF34C759),
  ];

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final t = (_c.value + i * 0.2) % 1.0;
            final y = -math.sin(t * math.pi) * 8;
            return Transform.translate(
              offset: Offset(0, y),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 5),
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: _colors[i],
                  shape: BoxShape.circle,
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _OtpView extends StatelessWidget {
  const _OtpView({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.phoneDisplay,
    required this.error,
    required this.errorMessage,
    required this.shake,
    required this.onCompleted,
    required this.onResend,
    required this.onEditNumber,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String phoneDisplay;
  final bool error;
  final String? errorMessage;
  final AnimationController shake;
  final ValueChanged<String> onCompleted;
  final VoidCallback onResend;
  final VoidCallback onEditNumber;

  static const Color _gold = Color(0xFFE5B800);
  static const Color _surface = Color(0xFF1A1A1E);
  static const Color _muted = Color(0xFF8A8A93);
  static const Color _error = Color(0xFFFF4D4D);

  @override
  Widget build(BuildContext context) {
    final defaultPin = PinTheme(
      width: 48,
      height: 56,
      textStyle: const TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
    );

    final focusedPin = defaultPin.copyWith(
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _gold, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: _gold.withValues(alpha: 0.25),
            blurRadius: 12,
          ),
        ],
      ),
    );

    final errorPin = defaultPin.copyWith(
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _error, width: 1.5),
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 28),
          const _NepArenaBadge(),
          const SizedBox(height: 28),
          const Text(
            'Confirmation',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Enter the 6-digit code sent to\n$phoneDisplay',
            textAlign: TextAlign.center,
            style: const TextStyle(color: _muted, fontSize: 14, height: 1.4),
          ),
          TextButton(
            onPressed: onEditNumber,
            child: const Text(
              'Edit number',
              style: TextStyle(color: _gold, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 12),
          AnimatedBuilder(
            animation: shake,
            builder: (context, child) {
              final t = shake.value;
              final dx = math.sin(t * math.pi * 6) * (1 - t) * 10;
              return Transform.translate(offset: Offset(dx, 0), child: child);
            },
            child: Pinput(
              length: 6,
              controller: controller,
              focusNode: focusNode,
              defaultPinTheme: defaultPin,
              focusedPinTheme: focusedPin,
              errorPinTheme: errorPin,
              forceErrorState: error,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onCompleted: onCompleted,
              cursor: Container(width: 2, height: 22, color: _gold),
            ),
          ),
          if (error && errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              errorMessage!,
              style: const TextStyle(color: _error, fontSize: 13),
            ),
          ],
          const Spacer(),
          TextButton(
            onPressed: onResend,
            child: const Text(
              'Resend code',
              style: TextStyle(color: _muted, fontWeight: FontWeight.w500),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 280.ms)
        .slideY(begin: 0.04, end: 0, curve: Curves.easeOutCubic);
  }
}

class _NepArenaBadge extends StatelessWidget {
  const _NepArenaBadge();

  static const Color _gold = Color(0xFFE5B800);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF0C933), _gold, Color(0xFFB38F00)],
        ),
        boxShadow: [
          BoxShadow(
            color: _gold.withValues(alpha: 0.35),
            blurRadius: 20,
            spreadRadius: 1,
          ),
        ],
      ),
      alignment: Alignment.center,
      child: const Text(
        'N',
        style: TextStyle(
          color: Color(0xFF0F0F11),
          fontSize: 32,
          fontWeight: FontWeight.w800,
          letterSpacing: -1,
        ),
      ),
    ).animate().scale(
          begin: const Offset(0.85, 0.85),
          end: const Offset(1, 1),
          duration: 400.ms,
          curve: Curves.easeOutBack,
        );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({super.key, required this.onStartOver});

  final VoidCallback onStartOver;

  static const Color _gold = Color(0xFFE5B800);
  static const Color _success = Color(0xFF34C759);
  static const Color _muted = Color(0xFF8A8A93);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const Spacer(),
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _success.withValues(alpha: 0.15),
              border: Border.all(color: _success.withValues(alpha: 0.5)),
            ),
            child: const Icon(Icons.check_rounded, color: _success, size: 48),
          )
              .animate()
              .scale(
                begin: const Offset(0.4, 0.4),
                end: const Offset(1, 1),
                duration: 450.ms,
                curve: Curves.easeOutBack,
              )
              .fadeIn(duration: 250.ms),
          const SizedBox(height: 24),
          const Text(
            "You're verified",
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
          ).animate().fadeIn(delay: 120.ms).slideY(begin: 0.1, end: 0),
          const SizedBox(height: 8),
          const Text(
            'Your phone number is confirmed.\nWelcome to NepARENA.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _muted, fontSize: 14, height: 1.4),
          ).animate().fadeIn(delay: 180.ms),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: OutlinedButton(
              onPressed: onStartOver,
              style: OutlinedButton.styleFrom(
                foregroundColor: _gold,
                side: const BorderSide(color: _gold),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Start over',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
