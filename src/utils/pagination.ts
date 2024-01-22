import { IsNumber, IsOptional } from 'class-validator';
import { PAGINATION } from '../constants';

class PageOptions {
  page: number;
  take: number;
  max: number;

  get skip(): number {
    return this.take > this.max ? (this.page - 1) * this.max : (this.page - 1) * this.take;
  }

  constructor(page = PAGINATION.PAGE, take = PAGINATION.SIZE, max = PAGINATION.MAX) {
    this.page = page;
    this.take = take;
    this.max = max;
  }
}
export const getPagination = (page?: number, size?: number) => {
  return new PageOptions(page, size);
};

export const sortData = (sortKey?: string, sortOrder?: unknown) => {
  const orderBy = {};
  if (sortKey) orderBy[sortKey] = sortOrder || 'desc';
  return orderBy;
};
