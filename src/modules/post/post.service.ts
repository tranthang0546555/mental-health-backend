import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import * as date from 'date-and-time';
import { ObjectId } from 'mongodb';
import { Collection, Connection, FilterQuery } from 'mongoose';
import { generate } from 'randomstring';
import * as slugTool from 'slug';
import { TimeLineDto } from '../../dto';
import { getPagination } from '../../utils/pagination';
import { searchKeyword } from '../../utils/searchKeyword';
import { NotificationType, PostType, Role, TimeLine } from './../../constants/index';
import { CommentDto, PostRequestDto } from './dto';

@Injectable()
export class PostService {
  private readonly postCollection: Collection;
  private readonly postViewCollection: Collection;
  private readonly postLikeCollection: Collection;
  private readonly postBookmarkCollection: Collection;
  private readonly categoryCollection: Collection;
  private readonly postCommentCollection: Collection;
  private readonly userCollection: Collection;
  private readonly postActionsCollection: Collection;
  private readonly postGroupCollection: Collection;
  private readonly notificationCollection: Collection;
  constructor(@InjectConnection() private connection: Connection) {
    this.postCollection = this.connection.collection('posts');
    this.postViewCollection = this.connection.collection('posts_view');
    this.postLikeCollection = this.connection.collection('posts_like');
    this.postBookmarkCollection = this.connection.collection('posts_bookmark');
    this.categoryCollection = this.connection.collection('category');
    this.postCommentCollection = this.connection.collection('posts_comment');
    this.userCollection = this.connection.collection('users');
    this.postActionsCollection = this.connection.collection('posts_action');
    this.postGroupCollection = this.connection.collection('post_groups');
    this.notificationCollection = this.connection.collection('notifications');
  }

  async getAll(query: PostRequestDto) {
    const { page: numPage, size, keyword, option, category } = query;
    const { page, skip, take } = getPagination(numPage, size);
    const filter: FilterQuery<unknown> = {};
    if (keyword) filter.title = searchKeyword(keyword);
    filter.deletedBy = null;
    if (category) filter.category = new ObjectId(category);
    const sortData: FilterQuery<unknown> = {};

    switch (option) {
      case PostType.NEWEST:
        sortData.createdAt = -1;
        break;
      case PostType.POPULAR:
        sortData.viewCount = -1;
        break;
      case PostType.RATE:
        sortData.likeCount = -1;
        break;
      default:
        sortData._id = 1;
    }

    const [totalRecords, data] = await Promise.all([
      this.postCollection.count(filter),
      this.postCollection
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: { avatar: 1, name: 1 } }]
            }
          },
          { $unwind: '$createdBy' },
          {
            $lookup: {
              from: 'category',
              localField: 'category',
              foreignField: '_id',
              as: 'category'
            }
          },
          { $unwind: '$category' },
          {
            $lookup: {
              from: 'posts_comment',
              localField: '_id',
              foreignField: 'postId',
              as: 'comments'
            }
          },
          {
            $lookup: {
              from: 'posts_like',
              localField: '_id',
              foreignField: 'postId',
              as: 'likes'
            }
          },
          {
            $lookup: {
              from: 'posts_view',
              localField: '_id',
              foreignField: 'postId',
              as: 'views',
              pipeline: [
                {
                  $group: {
                    _id: null,
                    sum: {
                      $sum: '$viewCount'
                    }
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              view: {
                $arrayElemAt: ['$views', 0]
              }
            }
          },
          {
            $project: {
              id: '$_id',
              title: 1,
              description: 1,
              category: 1,
              createdBy: 1,
              commentCount: {
                $cond: {
                  if: { $gte: [{ $size: '$comments' }, 1] },
                  then: { $subtract: [{ $size: '$comments' }, 1] },
                  else: 0
                }
              },
              likeCount: {
                $size: '$likes'
              },
              createdAt: 1,
              updatedAt: 1,
              slug: 1,
              viewCount: '$view.sum'
            }
          }
        ])
        .sort(sortData)
        .skip(skip)
        .limit(take)
        .toArray()
    ]);

    return { data, totalRecords, page, size: take };
  }

  async getPost(slug: string, uId?: string) {
    const userId = uId && new ObjectId(uId);
    const post = await this.postCollection.findOne({ slug, deletedBy: null });
    if (!post) throw new BadRequestException({ message: 'Không tìm thấy bài viết' });

    const [viewCount, likeCount, commentCount, liked, bookmarked, groupBy, createdBy, category] = await Promise.all([
      this.postViewCollection
        .aggregate([
          {
            $match: { postId: post._id }
          },
          {
            $group: {
              _id: null,
              sum: {
                $sum: '$viewCount'
              }
            }
          }
        ])
        .toArray(),
      this.postLikeCollection.count({ postId: post._id }),
      this.postCommentCollection.count({ postId: post._id }),
      this.postLikeCollection.count({ postId: post._id, userId }),
      this.postBookmarkCollection.count({ postId: post._id, userId }),
      post.groupBy && this.postGroupCollection.findOne({ _id: new ObjectId(post.groupBy) }),
      this.userCollection.findOne({ _id: new ObjectId(post.createdBy) }, { projection: { name: 1, avatar: 1 } }),
      this.categoryCollection.findOne({ _id: new ObjectId(post.category) })
    ]);

    const now = new Date();
    await this.postViewCollection.updateOne(
      { postId: post._id, createdAt: new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) },
      {
        $inc: { viewCount: 1 },
        $set: { createdAt: new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) }
      },
      { upsert: true }
    );

    return {
      ...post,
      viewCount: viewCount[0]?.sum,
      likeCount,
      commentCount: commentCount >= 1 ? commentCount - 1 : 0,
      liked,
      bookmarked,
      groupBy,
      createdBy,
      category
    };
  }

  async getPostById(postId: string, uId: string) {
    const userId = uId && new ObjectId(uId);
    const post = await this.postCollection.findOne<Record<string, unknown>>({
      _id: new ObjectId(postId),
      deletedBy: null
    });
    if (!post) throw new BadRequestException({ message: 'Không tìm thấy bài viết' });
    if (post.groupBy) post.groupBy = await this.postGroupCollection.findOne({ _id: post.groupBy });
    return post;
  }

  async likePost(pId: string, uId: string) {
    const postId = new ObjectId(pId);
    const userId = new ObjectId(uId);
    const record = await this.postLikeCollection.findOne({ postId, userId });
    if (record) {
      await this.postLikeCollection.deleteOne({ postId, userId });
      return { liked: false };
    }
    await this.postLikeCollection.insertOne({ postId, userId });
    return { liked: true };
  }

  async bookmarkPost(pId: string, uId: string) {
    const postId = new ObjectId(pId);
    const userId = new ObjectId(uId);
    const record = await this.postBookmarkCollection.findOne({ postId, userId });
    if (record) {
      await this.postBookmarkCollection.deleteOne({ postId, userId });
      return { bookmarked: false };
    }
    await this.postBookmarkCollection.insertOne({ postId, userId });
    return { bookmarked: true };
  }

  getComments = async (postId: string) => {
    await this.checkRootExisted(postId);

    const tree = await this.postCommentCollection
      .aggregate([
        {
          $match: {
            postId: new ObjectId(postId)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { avatar: 1, name: 1, fullName: 1 } }]
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        }
      ])
      .sort({ _id: -1 })
      .toArray();

    let root = getCommentRoot(tree);
    if (!root) return undefined;
    if ((root.right - 2) / 2 == 0) return root;

    loop(root, tree, 2);

    return root;
  };

  async checkRootExisted(postId: string) {
    const root = await this.postCommentCollection.findOne({ postId: new ObjectId(postId), left: 1 });
    if (!root) {
      await this.postCommentCollection.insertOne({
        postId: new ObjectId(postId),
        message: 'root',
        left: 1,
        right: 2,
        createdAt: new Date()
      });
    }
  }

  async newComment(postId: string, userId: string, body: CommentDto) {
    await this.checkRootExisted(postId);

    const parentComment = await this.postCommentCollection.findOne({
      postId: new ObjectId(postId),
      _id: new ObjectId(body.parentId)
    });

    //update tree
    await Promise.all([
      this.postCommentCollection.updateMany(
        { postId: new ObjectId(postId), right: { $gte: parentComment.right } },
        { $inc: { right: 2 } }
      ),
      this.postCommentCollection.updateMany(
        { postId: new ObjectId(postId), left: { $gte: parentComment.right } },
        { $inc: { left: 2 } }
      )
    ]);

    //insert
    const comment = {
      postId: new ObjectId(postId),
      message: body.message,
      left: parentComment.right,
      right: parentComment.right + 1,
      createdBy: new ObjectId(userId),
      createdAt: new Date()
    };
    await this.postCommentCollection.insertOne(comment);

    return { status: true };
  }

  async editComment(id: string, userId: string, body: CommentDto) {
    await this.postCommentCollection.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        createdBy: new ObjectId(userId)
      },
      { $set: { message: body.message } }
    );

    return { status: true };
  }

  async delComment(id: string) {
    await this.postCommentCollection.deleteOne({
      _id: new ObjectId(id)
    });

    return { status: true };
  }

  async createPost(body: any, createdBy: string) {
    const slugTitle = slugTool(body.title);
    const slugExist = await this.postCollection.count({ slug: slugTitle });
    if (body.category) body.category = new ObjectId(body.category);
    await this.postCollection.insertOne({
      ...body,
      slug: !slugExist ? slugTitle : slugTitle + generate(8),
      createdBy: new ObjectId(createdBy),
      createdAt: new Date()
    });

    return { status: true };
  }

  async editPost(slug: string, input: any, uId: string) {
    // const postId = new ObjectId(pId);
    const userId = new ObjectId(uId);

    const postExisted = await this.postCollection.count({ slug: slug });
    if (!postExisted) throw new BadRequestException({ message: 'Bài viết không tồn tại' });
    if (input.category) input.category = new ObjectId(input.category);
    await this.postCollection.updateOne(
      { slug: slug },
      { $set: { ...input, updatedAt: new Date(), updatedBy: userId } }
    );
    return { status: true };
  }

  async deletePost(postId: string, uId: string, role: string) {
    const postExisted = await this.postCollection.findOne({ _id: new ObjectId(postId) });
    if (!postExisted) throw new BadRequestException({ message: 'Bài viết không tồn tại' });

    if (role == Role.ADMIN) {
      await this.notificationCollection.insertOne({
        title: 'Bài viết của bạn đã bị xoá',
        description: 'Người quản trị đã xoá bài viết của bạn, id: ' + postId,
        receiver: postExisted.createdBy,
        type: NotificationType.DANGER,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await this.postCollection.findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { $set: { deletedAt: new Date(), deletedBy: new ObjectId(uId) } }
    );
    return { status: true };
  }

  async viewChart(uId: string, role: string, query: TimeLineDto) {
    const now = new Date();
    const dayOnMonth = [];
    for (let i = 0; i <= TimeLine[query.timeline].day; i++) {
      dayOnMonth.unshift(date.addDays(now, -i));
    }
    const filter: FilterQuery<unknown> = {};
    if (role === Role.DOCTOR) filter.createdBy = new ObjectId(uId);
    const posts = await this.postCollection.distinct('_id', filter);
    const views = await this.postViewCollection
      .aggregate([
        {
          $match: {
            postId: { $in: posts },
            createdAt: { $gte: new Date(dayOnMonth[0]) }
          }
        },
        {
          $group: {
            _id: {
              createdAt: '$createdAt'
            },
            countView: {
              $sum: '$viewCount'
            }
          }
        }
      ])
      .toArray();

    const labels = [];
    const data = [];

    dayOnMonth.forEach((v) => {
      const dayFormat = date.format(v, 'DD/MM');
      const hasValue = views.find((value) => {
        const day = new Date(value?._id.createdAt);
        const dF = date.format(day, 'DD/MM');
        return dayFormat == dF;
      });

      if (hasValue) {
        labels.unshift(dayFormat);
        data.unshift(hasValue?.countView || 0);
      } else {
        labels.unshift(dayFormat);
        data.unshift(0);
      }
    });

    return { labels: labels.reverse(), data: data.reverse() };
  }

  async getPostDeleted(query: PostRequestDto, uId: string, role: string) {
    const { page: numPage, size, keyword, option } = query;
    const { page, skip, take } = getPagination(numPage, size);
    const filter: FilterQuery<unknown> = {};
    if (role == Role.DOCTOR) filter.createdBy = new ObjectId(uId);

    filter.deletedBy = { $ne: null };
    if (keyword) filter.title = searchKeyword(keyword);
    const sortData: FilterQuery<unknown> = {};

    switch (option) {
      case PostType.NEWEST:
        sortData.createdAt = -1;
        break;
      case PostType.POPULAR:
        sortData.viewCount = -1;
        break;
      case PostType.RATE:
        sortData.likeCount = -1;
        break;
      default:
        sortData._id = -1;
    }

    const [totalRecords, data] = await Promise.all([
      this.postCollection.count(filter),
      this.postCollection
        .aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: { avatar: 1, name: 1 } }]
            }
          },
          { $unwind: '$createdBy' },
          {
            $lookup: {
              from: 'post_groups',
              localField: 'groupBy',
              foreignField: '_id',
              as: 'group'
            }
          },
          {
            $addFields: {
              groupBy: {
                $arrayElemAt: ['$group', 0]
              }
            }
          },
          {
            $lookup: {
              from: 'posts_comment',
              localField: '_id',
              foreignField: 'postId',
              as: 'comments'
            }
          },
          {
            $lookup: {
              from: 'posts_like',
              localField: '_id',
              foreignField: 'postId',
              as: 'likes'
            }
          },
          {
            $lookup: {
              from: 'posts_view',
              localField: '_id',
              foreignField: 'postId',
              as: 'views',
              pipeline: [
                {
                  $group: {
                    _id: null,
                    sum: {
                      $sum: '$viewCount'
                    }
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              view: {
                $arrayElemAt: ['$views', 0]
              }
            }
          },
          {
            $project: {
              id: '$_id',
              title: 1,
              description: 1,
              createdBy: 1,
              commentCount: {
                $size: '$comments'
              },
              likeCount: {
                $size: '$likes'
              },
              groupBy: 1,
              createdAt: 1,
              updatedAt: 1,
              slug: 1,
              viewCount: '$view.sum'
            }
          }
        ])
        .sort(sortData)
        .skip(skip)
        .limit(take)
        .toArray()
    ]);

    return { data, totalRecords, page, size: take };
  }

  async restorePost(pId: string, uId: string, role: string) {
    const post = await this.postCollection.findOne({ _id: new ObjectId(pId) });
    if (!post) throw new BadRequestException({ message: 'Không tìm thấy bài viết' });

    const isDeleteByAdmin = await this.userCollection.findOne({ _id: post.deletedBy, role: Role.ADMIN });
    if (isDeleteByAdmin && role != Role.ADMIN)
      throw new BadRequestException({ message: 'Bạn không đủ quyền thực hiện hành động này' });

    await this.postCollection.findOneAndUpdate(
      { _id: new ObjectId(pId) },
      { $set: { deletedBy: null, restoredBy: new ObjectId(uId), restoredAt: new Date(), deletedAt: null } }
    );

    return { status: true };
  }
}

const getComment = (comments: any[], leftIndex: number, rightIndex: number) => {
  return comments.find((c) => c.left === leftIndex || c.right === rightIndex);
};

const getCommentRoot = (comments: any[]) => {
  return comments.find((c) => c.left === 1);
};

const loop = (parent: any, comments: any[], index: number) => {
  if (index == parent.right) return;

  const comment = getComment(comments, index, index)!;
  if (!parent.child) parent.child = [];
  parent.child.push(comment);

  const hasChild = comment.right - comment.left > 1;
  if (hasChild) loop(comment, comments, index + 1);
  loop(parent, comments, comment.right + 1);
};
