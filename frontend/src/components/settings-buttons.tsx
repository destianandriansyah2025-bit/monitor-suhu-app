            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setConfig({
                  intervalSec: 5,
                  tempMin: 18,
                  tempMax: 27,
                  humMin: 40,
                  humMax: 70,
                  deviceEnabled: true
                });
                toast({ title: "Configuration Reset" });
              }}>Reset to Default</Button>
              <Button 
                onClick={handleSendConfig}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? 'Sending...' : 'Send to Device'}
              </Button>
            </div>