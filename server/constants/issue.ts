export enum IssueType {
  PLAYBACK = 1,
  SYNC = 2,
  SUBTITLES = 3,
  OTHER = 4,
}

export enum IssueStatus {
  OPEN = 1,
  RESOLVED = 2,
}

export const IssueTypeNames = {
  [IssueType.SYNC]: 'Audio Sync',
  [IssueType.PLAYBACK]: 'Media Playback',
  [IssueType.SUBTITLES]: 'Subtitles',
  [IssueType.OTHER]: 'Other',
};
