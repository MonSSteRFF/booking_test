export default () => ({
	mongoUrl: process.env.MONGO_URL || "mongodb://mongodb:27017/booking",
	clickhouseUrl: process.env.CLICKHOUSE_URL || "http://clickhouse:8123",
	redisUrl: process.env.REDIS_URL || "redis://redis:6379",
});
