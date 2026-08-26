interface PublishingChannel {
  builtIn: boolean;
  code: string;
  createdAt: string;
  name: string;
  updatedAt: string;
}

const mapPublishingChannel = (channel: {
  builtIn: boolean;
  code: string;
  createdAt: Date;
  name: string;
  updatedAt: Date;
}): PublishingChannel => {
  return {
    name: channel.name,
    code: channel.code,
    builtIn: channel.builtIn,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString()
  };
};

export { mapPublishingChannel };
export type { PublishingChannel };
