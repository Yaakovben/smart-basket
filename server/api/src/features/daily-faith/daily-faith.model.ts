import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyFaith extends Document {
  _id: Types.ObjectId;
  text: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dailyFaithSchema = new Schema<IDailyFaith>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

dailyFaithSchema.index({ createdAt: -1 });

export const DailyFaith = mongoose.model<IDailyFaith>('DailyFaith', dailyFaithSchema);
