import { IssueType } from '../../../server/constants/issue';

interface IssueOption {
  name: string;
  description: string;
  issueType: IssueType;
  mediaType?: 'movie' | 'tv';
}

export const issueOptions: IssueOption[] = [
  {
    name: 'Audio Sync',
    issueType: IssueType.SYNC,
    description:
      'Audio is out of sync with the video or becomes out of sync over a period of time.',
  },
  {
    name: 'Media Playback',
    issueType: IssueType.PLAYBACK,
    description:
      'Trying to playback the media results in an error or a black screen.',
  },
  {
    name: 'Subtitles',
    issueType: IssueType.SUBTITLES,
    description: 'Subtitles are missing from the media.',
  },
  {
    name: 'Other',
    issueType: IssueType.OTHER,
    description: 'A reason not listed above. Please specify below.',
  },
];
