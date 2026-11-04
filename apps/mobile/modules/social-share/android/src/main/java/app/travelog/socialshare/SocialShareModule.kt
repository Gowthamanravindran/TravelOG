package app.travelog.socialshare

import android.content.ClipData
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream

class ShareFailedException(message: String) : CodedException(message)

/**
 * Hands exported Studio slides to other apps (Plan 15): several images at once to
 * Instagram's new-post screen or Facebook, a Story to Instagram, saving to the
 * gallery through MediaStore (no photo-read permission), or the system sheet.
 */
class SocialShareModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SocialShare")

    Function("isInstalled") { packageName: String ->
      try {
        if (Build.VERSION.SDK_INT >= 33) {
          context.packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
        } else {
          @Suppress("DEPRECATION")
          context.packageManager.getPackageInfo(packageName, 0)
        }
        true
      } catch (e: PackageManager.NameNotFoundException) {
        false
      }
    }

    AsyncFunction("shareImages") { fileUris: List<String>, packageName: String? ->
      val uris = ArrayList(fileUris.map { contentUriFor(it) })
      val first = uris.firstOrNull() ?: throw ShareFailedException("Nothing to share")
      val intent = if (uris.size == 1) {
        Intent(Intent.ACTION_SEND).apply { putExtra(Intent.EXTRA_STREAM, first) }
      } else {
        Intent(Intent.ACTION_SEND_MULTIPLE).apply { putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris) }
      }
      intent.type = "image/jpeg"
      intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      // ClipData carries the read permission for every image, not just the first.
      val clip = ClipData.newRawUri(null, first)
      uris.drop(1).forEach { clip.addItem(ClipData.Item(it)) }
      intent.clipData = clip

      val activity = appContext.throwingActivity
      if (packageName != null) {
        intent.setPackage(packageName)
        uris.forEach { context.grantUriPermission(packageName, it, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        activity.startActivity(intent)
      } else {
        activity.startActivity(Intent.createChooser(intent, null))
      }
      true
    }

    AsyncFunction("shareToInstagramStory") { fileUri: String, appId: String ->
      val uri = contentUriFor(fileUri)
      val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
        setDataAndType(uri, "image/jpeg")
        putExtra("source_application", appId)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        setPackage(INSTAGRAM)
      }
      context.grantUriPermission(INSTAGRAM, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
      appContext.throwingActivity.startActivity(intent)
      true
    }

    AsyncFunction("saveToGallery") { fileUris: List<String> ->
      // Writing your own pictures needs no permission from Android 10; older phones use the share sheet.
      if (Build.VERSION.SDK_INT < 29) return@AsyncFunction false
      val resolver = context.contentResolver
      val base = System.currentTimeMillis()
      fileUris.forEachIndexed { i, fileUri ->
        val file = fileFor(fileUri)
        val values = ContentValues().apply {
          put(MediaStore.Images.Media.DISPLAY_NAME, "TravelOG-$base-${i + 1}.jpg")
          put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
          put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/TravelOG")
          // Keeps the slides in order in the gallery.
          put(MediaStore.Images.Media.DATE_TAKEN, base + i * 1000L)
          put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val item = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
          ?: throw ShareFailedException("Couldn't save to the gallery")
        resolver.openOutputStream(item).use { out ->
          if (out == null) throw ShareFailedException("Couldn't save to the gallery")
          FileInputStream(file).use { input -> input.copyTo(out) }
        }
        val done = ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }
        resolver.update(item, done, null, null)
      }
      true
    }
  }

  private fun fileFor(fileUri: String): File {
    val uri = Uri.parse(fileUri)
    val path = uri.path
    if (uri.scheme != "file" || path == null) throw ShareFailedException("Only app files can be shared")
    val file = File(path)
    if (!file.exists()) throw ShareFailedException("The exported slide is missing; export again")
    return file
  }

  private fun contentUriFor(fileUri: String): Uri =
    FileProvider.getUriForFile(context, context.packageName + ".SocialShareFileProvider", fileFor(fileUri))

  companion object {
    private const val INSTAGRAM = "com.instagram.android"
  }
}
