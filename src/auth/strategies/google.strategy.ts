import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { Inject, Injectable} from "@nestjs/common";
import googleOauthConfig from "../config/google-oauth.config";
import { ConfigType } from "@nestjs/config";
import { AuthService } from "../auth.service"; // Import AuthService

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        @Inject(googleOauthConfig.KEY)
        private googleConfiguration: ConfigType<typeof googleOauthConfig>,
        private authService: AuthService, 
    ) {
        // Thêm kiểm tra để đảm bảo các biến môi trường cần thiết đã được cung cấp.
        // Điều này giúp ứng dụng fail-fast và tránh các lỗi không mong muốn khi chạy.
        if (!googleConfiguration.clientID || !googleConfiguration.clientSecret || !googleConfiguration.callbackURL) {
            throw new Error('Google OAuth configuration is missing required values (clientID, clientSecret, callbackURL).');
        }

        super({
            clientID: googleConfiguration.clientID,
            clientSecret: googleConfiguration.clientSecret,
            callbackURL: googleConfiguration.callbackURL,
            scope: ['email', 'profile'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<any> {
        const { name, emails } = profile;
        if (!emails || emails.length === 0) {
            // Handle case where email is not provided by Google
            return done(new Error('No email found in Google profile'), false);
        }

        const user = {
            email: emails[0].value,
            firstName: name?.givenName, // name might be optional
            lastName: name?.familyName, // name might be optional
            accessToken,
        };

        try {
            const userPayload = {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            };
            const validatedUser = await this.authService.validateOAuthLogin(userPayload, 'google');
            done(null, validatedUser);
        } catch (err) {
            done(err, false);
        }
    }
}