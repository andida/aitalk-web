type TaskDisplay =
  | { kind: 'error'; message: string }
  | {
      kind: 'songs';
      items: { id?: string; title?: string; audioUrl: string }[];
    }
  | { kind: 'images'; items: { imageUrl: string }[] }
  | { kind: 'empty' };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAITaskDisplay(serialized: string): TaskDisplay {
  let value: unknown;
  try {
    value = JSON.parse(serialized) as unknown;
  } catch {
    return { kind: 'empty' };
  }
  if (!record(value)) return { kind: 'empty' };
  if (typeof value.errorMessage === 'string' && value.errorMessage) {
    return { kind: 'error', message: value.errorMessage };
  }
  if (Array.isArray(value.songs) && value.songs.length > 0) {
    const items = value.songs.flatMap((song: unknown) => {
      if (!record(song) || typeof song.audioUrl !== 'string' || !song.audioUrl)
        return [];
      return [
        {
          id: typeof song.id === 'string' ? song.id : undefined,
          title: typeof song.title === 'string' ? song.title : undefined,
          audioUrl: song.audioUrl,
        },
      ];
    });
    return { kind: 'songs', items };
  }
  if (Array.isArray(value.images) && value.images.length > 0) {
    const items = value.images.flatMap((image: unknown) =>
      record(image) && typeof image.imageUrl === 'string' && image.imageUrl
        ? [{ imageUrl: image.imageUrl }]
        : []
    );
    return { kind: 'images', items };
  }
  return { kind: 'empty' };
}
