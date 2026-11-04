import ExpoModulesCore
import Photos
import UIKit

/// Hands exported Studio slides to other apps (Plan 15). iOS doesn't let apps hand
/// several images to Instagram's feed, so slides are saved to Photos in order and
/// Instagram's library opens; Stories go through the pasteboard; everything else
/// uses the share sheet.
public class SocialShareModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SocialShare")

    AsyncFunction("canOpen") { (scheme: String) -> Bool in
      guard let url = URL(string: "\(scheme)://") else { return false }
      return UIApplication.shared.canOpenURL(url)
    }
    .runOnQueue(.main)

    AsyncFunction("saveToPhotos") { (fileUris: [String], promise: Promise) in
      PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        guard status == .authorized || status == .limited else {
          promise.resolve([String]())
          return
        }
        var ids: [String] = []
        let base = Date()
        PHPhotoLibrary.shared().performChanges({
          for (i, uri) in fileUris.enumerated() {
            guard let url = URL(string: uri) else { continue }
            let request = PHAssetCreationRequest.creationRequestForAssetFromImage(atFileURL: url)
            // Keeps the slides in order in Photos.
            request?.creationDate = base.addingTimeInterval(Double(i))
            if let id = request?.placeholderForCreatedAsset?.localIdentifier { ids.append(id) }
          }
        }) { ok, error in
          if ok {
            promise.resolve(ids)
          } else {
            promise.reject("ERR_SAVE_PHOTOS", error?.localizedDescription ?? "Couldn't save to Photos")
          }
        }
      }
    }

    AsyncFunction("openInstagramLibrary") { (localIdentifier: String) -> Bool in
      let encoded = localIdentifier.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? localIdentifier
      guard let url = URL(string: "instagram://library?LocalIdentifier=\(encoded)"),
            UIApplication.shared.canOpenURL(url) else { return false }
      UIApplication.shared.open(url)
      return true
    }
    .runOnQueue(.main)

    AsyncFunction("shareToInstagramStory") { (fileUri: String, appId: String) -> Bool in
      guard let fileUrl = URL(string: fileUri),
            let data = try? Data(contentsOf: fileUrl),
            let url = URL(string: "instagram-stories://share?source_application=\(appId)"),
            UIApplication.shared.canOpenURL(url) else { return false }
      UIPasteboard.general.setItems(
        [["com.instagram.sharedSticker.backgroundImage": data]],
        options: [.expirationDate: Date().addingTimeInterval(300)]
      )
      UIApplication.shared.open(url)
      return true
    }
    .runOnQueue(.main)

    AsyncFunction("shareImages") { (fileUris: [String], promise: Promise) in
      let urls = fileUris.compactMap { URL(string: $0) }
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("ERR_NO_VIEW", "Nothing to show the share sheet on")
        return
      }
      let sheet = UIActivityViewController(activityItems: urls, applicationActivities: nil)
      sheet.popoverPresentationController?.sourceView = presenter.view
      sheet.completionWithItemsHandler = { _, completed, _, _ in promise.resolve(completed) }
      presenter.present(sheet, animated: true)
    }
    .runOnQueue(.main)
  }
}
