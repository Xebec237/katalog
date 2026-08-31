import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || 'github-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github-client-secret',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const emails: any[] = profile.emails || [];
    const primaryEmail =
      emails.find((e: any) => e.primary)?.value ||
      emails[0]?.value ||
      `${profile.username}@github.noemail`;

    const user = await this.authService.socialLogin({
      email: primaryEmail,
      name: profile.displayName || profile.username || 'GitHub User',
      picture: profile.photos?.[0]?.value,
      providerId: profile.id,
      provider: 'github',
    });
    done(null, user);
  }
}
