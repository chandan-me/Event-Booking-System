from fastapi import APIRouter, Depends, status, Response, Request
from sqlalchemy.orm import Session

from app.schemas.auth import (
    RegisterRequest, VerifyEmailRequest, ResendOtpRequest,
    LoginRequest, TokenResponse, RefreshTokenRequest, LogoutRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserResponse, StandardResponse,
    MFASetupResponse, MFAVerifyRequest, MFADisableRequest
)
from app.api.deps import get_db, get_email_service, get_auth_service, get_current_user
from app.services.auth_service import AuthService
from app.services.email_service import BaseEmailService
from app.models.user import User
from app.core.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=StandardResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account"
)
def register(
    req: RegisterRequest,
    db: Session = Depends(get_db),
    email_service: BaseEmailService = Depends(get_email_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    user_response = auth_service.register(
        db,
        email_service=email_service,
        full_name=req.full_name,
        email=req.email,
        password=req.password,
        role=req.role or "CUSTOMER",
        organization_name=req.organization_name
    )
    return StandardResponse(
        success=True,
        data=user_response,
        message="Account created successfully. Please check your email for the verification code."
    )


@router.post(
    "/verify-email",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Verify email with 6-digit OTP"
)
@router.post(
    "/verify-otp",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Verify email with 6-digit OTP (alias)"
)
def verify_email(
    req: VerifyEmailRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.verify_email(db, req.email, req.otp)
    return StandardResponse(
        success=True,
        data=None,
        message="Email verified successfully. You may now log in."
    )


@router.post(
    "/resend-otp",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Resend verification OTP"
)
def resend_otp(
    req: ResendOtpRequest,
    db: Session = Depends(get_db),
    email_service: BaseEmailService = Depends(get_email_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.resend_otp(db, email_service, req.email)
    return StandardResponse(
        success=True,
        data=None,
        message="If an account exists, a new verification code has been dispatched."
    )


@router.post(
    "/login",
    response_model=StandardResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive JWT access token"
)
def login(
    req: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    token_resp = auth_service.login(db, req.email, req.password, req.totp_code)
    
    # Store refresh token in secure HttpOnly cookie for web security
    response.set_cookie(
        key="refresh_token",
        value=token_resp.refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=7 * 24 * 3600
    )

    return StandardResponse(
        success=True,
        data=token_resp,
        message="Login successful"
    )


@router.post(
    "/refresh",
    response_model=StandardResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue new access token"
)
def refresh(
    request: Request,
    response: Response,
    req_body: RefreshTokenRequest | None = None,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    # Support refresh token from request body or HttpOnly cookie
    raw_token = None
    if req_body and req_body.refresh_token:
        raw_token = req_body.refresh_token
    elif "refresh_token" in request.cookies:
        raw_token = request.cookies.get("refresh_token")

    if not raw_token:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    token_resp = auth_service.refresh_session(db, raw_token)

    response.set_cookie(
        key="refresh_token",
        value=token_resp.refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=7 * 24 * 3600
    )

    return StandardResponse(
        success=True,
        data=token_resp,
        message="Token refreshed successfully"
    )


@router.post(
    "/logout",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Revoke session and clear refresh cookie"
)
def logout(
    request: Request,
    response: Response,
    req_body: LogoutRequest | None = None,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    raw_token = None
    if req_body and req_body.refresh_token:
        raw_token = req_body.refresh_token
    elif "refresh_token" in request.cookies:
        raw_token = request.cookies.get("refresh_token")

    auth_service.logout(db, raw_token)
    response.delete_cookie("refresh_token")

    return StandardResponse(
        success=True,
        data=None,
        message="Logged out successfully"
    )


@router.post(
    "/forgot-password",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Request a password reset code"
)
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    email_service: BaseEmailService = Depends(get_email_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.forgot_password(db, email_service, req.email)
    return StandardResponse(
        success=True,
        data=None,
        message="If an account with this email exists, a password reset code has been sent."
    )


@router.post(
    "/reset-password",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Reset password with verified OTP"
)
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.reset_password(db, req.email, req.otp, req.new_password)
    return StandardResponse(
        success=True,
        data=None,
        message="Password has been reset successfully. Please log in with your new password."
    )


@router.get(
    "/me",
    response_model=StandardResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve current authenticated user profile"
)
def get_me(current_user: User = Depends(get_current_user)):
    return StandardResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
        message="Profile retrieved successfully"
    )


@router.post(
    "/mfa/setup",
    response_model=StandardResponse[MFASetupResponse],
    status_code=status.HTTP_200_OK,
    summary="Initiate Multi-Factor Authentication (TOTP) setup"
)
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    mfa_data = auth_service.setup_mfa(db, current_user)
    return StandardResponse(
        success=True,
        data=mfa_data,
        message="MFA configuration initialized. Scan the QR code or enter secret in your authenticator app."
    )


@router.post(
    "/mfa/verify",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Verify TOTP code to activate MFA"
)
def verify_mfa(
    req: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.verify_mfa(db, current_user, req.code)
    return StandardResponse(
        success=True,
        data=None,
        message="MFA has been successfully verified and activated."
    )


@router.post(
    "/mfa/disable",
    response_model=StandardResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Disable MFA with password and authenticator code"
)
def disable_mfa(
    req: MFADisableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    auth_service.disable_mfa(db, current_user, req.password, req.code)
    return StandardResponse(
        success=True,
        data=None,
        message="MFA has been successfully disabled."
    )
