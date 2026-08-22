# NepARENA Mobile (Flutter)

## Phone OTP Verification Screen

Production-ready screen: `lib/screens/phone_otp_verification_screen.dart`

### Dependencies

Add to your app `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_animate: ^4.5.0
  pinput: ^5.0.0
```

### Usage

```dart
import 'package:your_app/screens/phone_otp_verification_screen.dart';

Navigator.of(context).push(
  MaterialPageRoute(
    builder: (_) => PhoneOtpVerificationScreen(
      onSendCode: (e164) async {
        // Call your SMS/OTP backend
        return true;
      },
      onVerifyCode: (e164, code) async {
        // Verify with backend
        return code == expected;
      },
      onVerified: () {
        // Navigate to home / complete onboarding
      },
    ),
  ),
);
```

### Demo OTP

Without hooks, mock mode accepts **`123456`** and rejects other codes.

### Theme

| Token        | Value     |
|-------------|-----------|
| Background  | `#0F0F11` |
| Gold accent | `#E5B800` |
| Success     | `#34C759` |
| Error       | `#FF4D4D` |
