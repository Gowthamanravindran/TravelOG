package app.travelog.socialshare

import androidx.core.content.FileProvider

/** Own subclass so its manifest entry doesn't clash with other modules' FileProviders. */
class SocialShareFileProvider : FileProvider()
