export const PAGINATION = {
  PAGE: 1,
  SIZE: 10,
  MAX: 200
};

export enum Role {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  USER = 'user',
  AS = 'appointment staff',
  OSS = 'online support staff'
}

export enum NotificationType {
  SUCCESS = 'success',
  DANGER = 'danger',
  WARNING = 'warning',
  INFO = 'info'
}

export const PostType = {
  NEWEST: 'newest',
  POPULAR: 'popular',
  RATE: 'rate'
};

export const ERROR_ACCOUNT_CODE = {
  ACTIVATED: 'Activated',
  NOT_ACTIVATED: 'Not Activated',
  BANNED: 'Banned',
  NOT_EXISTED: 'Not existed',
  EXISTED: 'Existed'
};

export const SCHEDULE_STATUS = {
  COMPLETED: 'completed',
  CANCEL: 'cancel',
  PROGRESS: 'progress',
  PENDING: 'pending'
};

export const TimeLine: Record<string, { title: string; day: number }> = {
  '15d': {
    title: '15 ngày',
    day: 15
  },
  '30d': {
    title: '30 ngày',
    day: 30
  },
  '3m': {
    title: '3 tháng',
    day: 90
  }
};

export const TIMELINE_OPTION = {
  _15D: '15d',
  _30D: '30d',
  _3M: '3m'
};

export const MEDIA_FILE = {
  AUDIO: 'audio',
  VIDEO: 'video'
};
