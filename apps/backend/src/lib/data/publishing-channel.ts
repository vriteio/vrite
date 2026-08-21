interface PublishingChannel {
  name: string;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapPublishingChannel = (channel: {
  name: string;
  builtIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PublishingChannel => {
  return {
    name: channel.name,
    builtIn: channel.builtIn,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString()
  };
};

export { mapPublishingChannel };
export type { PublishingChannel };
