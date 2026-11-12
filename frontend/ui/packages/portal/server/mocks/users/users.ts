import type { Writeable } from '../../types'
import type { UsersDto } from '../auth/types'

export const USERS_LIST: Writeable<UsersDto> = {
  users: [{
    id: 'JD_1234',
    email: 'john.doe@example.com',
    name: 'John Doe',
    avatarUrl: 'https://github.com/uploads/001/avatar.png',
  }, {
    id: 'user002',
    email: 'robert.johnson@example.com',
    name: 'Robert Johnson',
    avatarUrl: 'https://github.com/uploads/002/avatar.png',
  }, {
    id: 'user003',
    email: 'user.003@example.com',
    name: 'User 003',
    avatarUrl: 'https://github.com/uploads/003/avatar.png',
  }, {
    id: 'user004',
    email: 'user.004@example.com',
    name: 'Alexander Aleksandrov',
    avatarUrl: 'https://github.com/uploads/004/avatar.png',
  }, {
    id: 'user005',
    email: 'user.005@example.com',
    name: 'Petr Petrov',
    avatarUrl: 'https://github.com/uploads/005/avatar.png',
  }, {
    id: 'user006',
    email: 'user.006@example.com',
    name: 'User 006',
    avatarUrl: 'https://github.com/uploads/006/avatar.png',
  }, {
    id: 'user007',
    email: 'user.007@example.com',
    name: 'User 007',
    avatarUrl: 'https://github.com/uploads/007/avatar.png',
  }, {
    id: 'user008',
    email: 'user.008@example.com',
    name: 'User 008',
    avatarUrl: 'https://github.com/uploads/008/avatar.png',
  }, {
    id: 'user009',
    email: 'user.009@example.com',
    name: 'User 009',
    avatarUrl: 'https://github.com/uploads/009/avatar.png',
  }, {
    id: 'user010',
    email: 'ivan.ivanov@example.com',
    name: 'Ivan Ivanov',
    avatarUrl: 'https://github.com/uploads/010/avatar.png',
  }],
}
