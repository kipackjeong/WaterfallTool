# General
### Datas
LAPTOP-Q87BCMTU
### When the database connection fails
- Check if tcp/ip is enabled in sql server configuration > network configuration.
- Check if SQL authentication is enabled in sql server properties.
- Try restarting the sql server and sql server browser.

### Kill Process running in Port
- Use admin terminal 
  ```
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8888).OwningProcess | Stop-Process

  # Mac
  lsof -i :3002 | grep LISTEN
  kill -9 <pid>
  ```

### Get firebase JWT token
in server root run `node generate-token.js`

### Troubleshoot
- ERROR : POST /auth/register - 500: "There is no configuration corresponding to the provided identifier."
  - Check requested Authentication is enabled in firebase console.

### mappingsStateArr
``` ts
[
    {
        "tabName": "Procedure",
        "keyword": "Procedure",
        "data": [
            {
                "Procedure_Group_Final": "Proc C",
                "Procedure_Group": "Proc Cx",
                "Total_Charge_Amount": 2183088.59,
                "Total_Payment_Amount": 738826.55,
                "Earliest_Min_DOS": "2023-01",
                "Latest_Max_DOS": "2023-01",
                "Waterfall_Group": "Proc C"
            },
            {
                "Procedure_Group_Final": "Proc A",
                "Procedure_Group": "Proc Ax",
                "Total_Charge_Amount": 2194933.39,
                "Total_Payment_Amount": 756651.69,
                "Earliest_Min_DOS": "2023-01",
                "Latest_Max_DOS": "2023-01",
                "Waterfall_Group": "Proc A"
            },
            {
                "Procedure_Group_Final": "Proc C",
                "Procedure_Group": "Proc C",
                "Total_Charge_Amount": 59500,
                "Total_Payment_Amount": 500,
                "Earliest_Min_DOS": "2020-02",
                "Latest_Max_DOS": "2020-11",
                "Waterfall_Group": "Proc C"
            },
            {
                "Procedure_Group_Final": "Proc A",
                "Procedure_Group": "Proc A",
                "Total_Charge_Amount": 59500,
                "Total_Payment_Amount": 500,
                "Earliest_Min_DOS": "2020-03",
                "Latest_Max_DOS": "2021-12",
                "Waterfall_Group": "Proc A"
            },
            {
                "Procedure_Group_Final": "Proc B",
                "Procedure_Group": "Proc B",
                "Total_Charge_Amount": 59500,
                "Total_Payment_Amount": 500,
                "Earliest_Min_DOS": "2020-01",
                "Latest_Max_DOS": "2020-10",
                "Waterfall_Group": "Proc B"
            },
            {
                "Procedure_Group_Final": "Proc B",
                "Procedure_Group": "Proc Bx",
                "Total_Charge_Amount": 2196622.58,
                "Total_Payment_Amount": 755794.38,
                "Earliest_Min_DOS": "2023-01",
                "Latest_Max_DOS": "2023-01",
                "Waterfall_Group": "Proc B"
            }
        ]
    },
    {
        "tabName": "Insurance",
        "keyword": "Primary_Insurance",
        "data": [...]
    }
]
```

## Daily Tasks/Logs

- [ ] TODO: implement populate menu button
- [ ] TODO: implement list waterfall cohorts button
- [ ] TODO: local db connection keeps failing. Need to figure out why...


- [ ] TODO: enable deleting the project view.

- [ ] TODO: MappingView > WaterfallCell: implement the logic to update the waterfall value

- [x] TODO: need to make the project views for sidebar to be cached so it lasts forever.
  - handled with fetching data from API server
- [x] TODO: implement loading
- [x] TODO: create mappingsState store to be per instanceview scoped.
- [x] TODO: implement populating counts in the Waterfall Cohorts table list in the Main page of InstanceView.

### 2025-02-26
### 2025-02-25
#### Local Sql Server Connection Failure
  - The local db connection is keep failing. Things I've tried:
    - Enabled TCP/IP
    - Restarted sql server and sql server browser
    - Tried with `encrypt: false`, but this seems to be always on.

  - Was able to login with SQL authentication in MSSM UI, but still failing in code.


