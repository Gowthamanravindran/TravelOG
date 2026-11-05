import type { StudioFormat } from '@travelog/core';
import { type } from '@travelog/ui';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { errorMessage } from '@/lib/format';
import {
  postStory,
  postToFacebook,
  postToInstagram,
  saveAndOpenInstagram,
  saveAll,
  shareAll,
  shareTargets,
  type PostResult,
  type ShareTargets,
} from '@/lib/social-share';
import { Button, ErrorText } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** Where exported slides go: Instagram, Facebook, the gallery or any app (Plan 15). */
export function ShareActions({
  files,
  current,
  format,
}: {
  files: string[];
  current: number;
  format: StudioFormat;
}) {
  const t = useTheme();
  const [targets, setTargets] = useState<ShareTargets | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    shareTargets()
      .then((x) => live && setTargets(x))
      .catch(
        () =>
          live && setTargets({ native: false, instagram: false, facebook: false, story: false }),
      );
    return () => {
      live = false;
    };
  }, []);

  const n = files.length;
  const run = async (
    key: string,
    fn: () => Promise<PostResult>,
    done: (r: PostResult) => string | null,
  ) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      setMessage(done(await fn()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const label = (key: string, text: string) => (busy === key ? 'Opening…' : text);
  const storyFile = files[current] ?? files[0];
  const gallery = Platform.OS === 'ios' ? 'Photos' : 'your gallery';
  const igMessage = (r: PostResult): string | null =>
    r === 'opened'
      ? `Instagram should show your ${n} slides, ready to post. If it opened without them, tap Save & open Instagram.`
      : r === 'saved-and-opened'
        ? `Slides saved to ${gallery} in order. In Instagram, tap +, choose Post, turn on multi-select and pick slides 1 to ${n}.`
        : r === 'saved'
          ? `Slides saved to ${gallery} in order. Open Instagram, start a post and pick slides 1 to ${n}.`
          : null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={[type.headline, { color: t.ink }]}>
        {n} {n === 1 ? 'slide' : 'slides'} ready
      </Text>

      {targets && !targets.native ? (
        <Text style={[type.caption, { color: t.ink2 }]}>
          Install the latest TravelOG build to post straight to Instagram and Facebook. Until then,
          share each slide below.
        </Text>
      ) : null}

      {format === 'post' ? (
        <Text accessibilityRole="text" style={[type.caption, { color: t.ink2 }]}>
          Instagram crops a carousel to square at first. Tap Ratio in Instagram and choose 4:5 so
          nothing is cut off and the slides join up.
        </Text>
      ) : null}

      <Button
        label={label('ig', 'Post to Instagram')}
        icon="camera"
        disabled={!!busy || (targets?.native === true && !targets.instagram)}
        onPress={() => run('ig', () => postToInstagram(files), igMessage)}
      />
      <Button
        label={label('igsave', 'Save & open Instagram')}
        variant="ghost"
        disabled={!!busy || (targets?.native === true && !targets.instagram)}
        onPress={() => run('igsave', () => saveAndOpenInstagram(files), igMessage)}
      />
      {targets?.native && !targets.instagram ? (
        <Text style={[type.caption, { color: t.ink2 }]}>
          Instagram isn&apos;t installed on this phone.
        </Text>
      ) : null}

      {targets?.story ? (
        <Button
          label={label('story', `Instagram Story · slide ${current + 1}`)}
          variant="ghost"
          disabled={!!busy || !storyFile}
          onPress={() =>
            run(
              'story',
              () => postStory(storyFile!),
              () => null,
            )
          }
        />
      ) : null}
      {format !== 'story' && targets?.story ? (
        <Text style={[type.caption, { color: t.ink2 }]}>
          Stories are 9:16; a {format === 'post' ? '4:5' : 'square'} slide shows with a background.
        </Text>
      ) : null}

      <Button
        label={label('fb', 'Share to Facebook')}
        icon="share"
        variant="ghost"
        disabled={
          !!busy || (targets?.native === true && Platform.OS === 'android' && !targets.facebook)
        }
        onPress={() =>
          run(
            'fb',
            () => postToFacebook(files),
            () => null,
          )
        }
      />
      <Button
        label={label('save', 'Save all to gallery')}
        icon="download"
        variant="ghost"
        disabled={!!busy}
        onPress={() =>
          run(
            'save',
            () => saveAll(files),
            (r) => (r === 'saved' ? `Saved ${n} slides to your gallery, in order.` : null),
          )
        }
      />
      <Button
        label={label('more', 'More apps…')}
        icon="share"
        variant="ghost"
        disabled={!!busy}
        onPress={() =>
          run(
            'more',
            () => shareAll(files),
            () => null,
          )
        }
      />

      {message ? <Text style={[type.body, { color: t.ink }]}>{message}</Text> : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
