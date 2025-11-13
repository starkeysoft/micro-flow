const delay_cron = async (fire_time) => {
  while (Date.now() < fire_time) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return fire_time;
}
