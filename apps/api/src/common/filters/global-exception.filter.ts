import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
      
      if (process.env.NODE_ENV === 'production') {
        this.logToExternalService(exception, request);
      }
    }

    this.logger.error({
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      stack: exception instanceof Error ? exception.stack : undefined,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    const acceptLanguage = request.get('accept-language');
    const language = acceptLanguage?.split(',')[0]?.split('-')[0] || 'en';
    const userMessage = this.getLocalizedErrorMessage(status, language);

    const responseBody: Record<string, unknown> = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: userMessage,
    };

    if (process.env.NODE_ENV === 'development') {
      responseBody.error = message;
      responseBody.stack = exception instanceof Error ? exception.stack : undefined;
    }

    response.status(status).json(responseBody);
  }

  private getLocalizedErrorMessage(status: number, language: string): string {
    const messages: Record<string, Record<number, string>> = {
      en: {
        400: 'Invalid request. Please check your input.',
        401: 'You need to be logged in to access this resource.',
        403: 'You don\'t have permission to access this resource.',
        404: 'The requested resource was not found.',
        422: 'The request body contains invalid data.',
        429: 'Too many requests. Please try again later.',
        500: 'Something went wrong on our end. We\'re working on it.',
        503: 'Service temporarily unavailable. Please try again later.',
      },
      fr: {
        400: 'Requête invalide. Veuillez vérifier votre saisie.',
        401: 'Vous devez être connecté pour accéder à cette ressource.',
        403: 'Vous n\'avez pas la permission d\'accéder à cette ressource.',
        404: 'La ressource demandée n\'a pas été trouvée.',
        429: 'Trop de requêtes. Veuillez réessayer plus tard.',
        500: 'Une erreur est survenue. Nous travaillons à la résoudre.',
      },
      es: {
        400: 'Solicitud inválida. Por favor verifique su entrada.',
        401: 'Debe iniciar sesión para acceder a este recurso.',
        403: 'No tiene permiso para acceder a este recurso.',
        404: 'El recurso solicitado no fue encontrado.',
        429: 'Demasiadas solicitudes. Por favor intente más tarde.',
        500: 'Algo salió mal. Estamos trabajando en ello.',
      },
      de: {
        400: 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingabe.',
        401: 'Sie müssen angemeldet sein, um auf diese Ressource zuzugreifen.',
        403: 'Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.',
        404: 'Die angeforderte Ressource wurde nicht gefunden.',
        429: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        500: 'Etwas ist schief gelaufen. Wir arbeiten daran.',
      },
      zh: {
        400: '无效请求。请检查您的输入。',
        401: '您需要登录才能访问此资源。',
        403: '您没有权限访问此资源。',
        404: '请求的资源未找到。',
        429: '请求过多。请稍后重试。',
        500: '出了点问题。我们正在处理。',
      },
      ja: {
        400: '無効なリクエスト。入力を確認してください。',
        401: 'このリソースにアクセスするにはログインする必要があります。',
        403: 'このリソースにアクセスする権限がありません。',
        404: '要求されたリソースが見つかりません。',
        429: 'リクエストが多すぎます。後でもう一度お試しください。',
        500: '問題が発生しました。対応中です。',
      },
      hi: {
        400: 'अमान्य अनुरोध। कृपया अपना इनपुट जांचें।',
        401: 'इस संसाधन तक पहुंचने के लिए आपको लॉग इन करना होगा।',
        403: 'आपके पास इस संसाधन तक पहुंचने की अनुमति नहीं है।',
        404: 'अनुरोधित संसाधन नहीं मिला।',
        429: 'बहुत सारे अनुरोध। कृपया बाद में पुनः प्रयास करें।',
        500: 'कुछ गलत हो गया। हम इस पर काम कर रहे हैं।',
      },
      ar: {
        400: 'طلب غير صالح. يرجى التحقق من المدخلات الخاصة بك.',
        401: 'يجب تسجيل الدخول للوصول إلى هذا المورد.',
        403: 'ليس لديك إذن للوصول إلى هذا المورد.',
        404: 'لم يتم العثور على المورد المطلوب.',
        429: 'طلبات كثيرة جدا. يرجى المحاولة مرة أخرى في وقت لاحق.',
        500: 'حدث خطأ ما. نحن نعمل على إصلاحه.',
      },
      ta: {
        400: 'தவறான கோரிக்கை. உங்கள் உள்ளீடை சரிபார்க்கவும்.',
        401: 'இந்த வளத்தை அணுக நீங்கள் உள்நுழைய வேண்டும்.',
        403: 'இந்த வளத்தை அணுக உங்களுக்கு அனுமதி இல்லை.',
        404: 'கோரிய வளம் கிடைக்கவில்லை.',
        429: 'மிகவும் கோரிக்கைகள். பிறகு முயற்சிக்கவும்.',
        500: 'ஏதோ தவறு நடந்தது. நாங்கள் அதை சரிசெய்கிறோம்.',
      },
      si: {
        400: 'අතිරේක ඉල්ලීමකි. කරුණාකර ඔබේ ආදානය පරීක්ෂා කරන්න.',
        401: 'මෙම සම්පතට පිවිසීමට ඔබ පිවිසිය යුතුය.',
        403: 'මෙම සම්පතට පිවිසීමට ඔබට අවසරයක් නැත.',
        404: 'ඉල්ලූ සම්පත හමු නොවීය.',
        429: 'ඉල්ලීම් ඉතා වැඩිය. පසුව උත්සාහ කරන්න.',
        500: 'යම් දෝෂයක් ඇති විය. අපි එය නිවැරදි කිරීමේ ය.',
      },
    };

    const langMessages = messages[language] || messages.en;
    return langMessages[status] || langMessages[500];
  }

  private logToExternalService(error: Error, request: Request) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };
    
    console.error('[EXTERNAL_LOG]', JSON.stringify(logEntry));
  }
}
