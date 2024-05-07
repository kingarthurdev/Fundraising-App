/*import java.util.Arrays;
class Solution {
    public static int removeElement(int[] nums, int val) {
        int count=0;
        for(int a =0; a<nums.length; a++){
            if(nums[a] == val){
                nums[a]=Integer.MAX_VALUE;
                count++;
            }
        }
        Arrays.sort(nums);
        for( int b: nums){
            System.out.print(b+" ");
        }
        System.out.println();
        return count;
    }
    public static void main(String[] args) {
        int[] a = {0,1,2,2,3,0,4,2};
        System.out.println(removeElement(a,2));
    }
}*/

/* 
import java.util.*;
class Solution {
    public static int removeDuplicates(int[] nums) {
        HashSet<Integer> seen = new HashSet<Integer>();
        int count =0;
        for(int i =0; i<nums.length; i++){
            if(!seen.contains(nums[i])){
                count++;
                seen.add(nums[i]);
            }else{
                nums[i]=Integer.MAX_VALUE;
            }
        }
        for(int i: nums){
            System.out.println(i);
        }
        Arrays.sort(nums);
        
        return count;
    }
    public static void main(String[] args) {
        int[] a = {0,0,1,1};
        System.out.println(removeDuplicates(a));
    }
}*/

//better solution attempt:
//[1,1,2]
/* 
import java.util.*;
class Solution {        
    //The jankiest shit i've ever written!

    public static int removeDuplicates(int[] nums) {
        ArrayList<Integer> list = new ArrayList<>();
        int count =0; 
        for(int i: nums){
            if(!Arrays.asList(list).contains(i)){
                list.add(i);
            }
        }
        for(int i =0; i<list.size(); i++){
            int count2 =0;
            for(int j=0; j<nums.length; j++){
                if(nums[j]==list.get(i)){
                    count2 ++;
                    if(count2 >=3){
                        nums[j]= Integer.MAX_VALUE;
                        count++;
                    }
                }
            }
        }
        Arrays.sort(nums);
        for (int a : nums) {
            System.out.println(a);
        }
        return nums.length-count;
    }

    public static void main(String[] args) {
        int[] a = { 1, 1, 1, 2, 2, 3 };
        System.out.println(removeDuplicates(a));

    }
}*/

import java.util.*;
class Solution {
    public static void main(String[] args) {
        System.out.println(isIsomorphic("paper", "title"));

    }
    public static boolean isIsomorphic(String s, String t) {
        int count=0;
        HashSet<String> uniqueInS = new HashSet<String>();
        HashSet<String> uniqueInT = new HashSet<String>();
        String[] s2 = s.split("");
        String[] t2 = t.split("");
        String temp =s;

        if(s2.length!=t2.length){
            return false;
        }
        if(s2.length ==1)
            return true;
        for(int i=0; i<s2.length; i++){

            if(!(uniqueInS.contains(s2[i]))){
                uniqueInS.add(s2[i]);
                count++;
            }
            if(!(uniqueInT.contains(t2[i]))){
                uniqueInT.add(t2[i]);
            }
        }
        for(int i =0; i<count+1; i++){
            temp=temp.replace(s2[i],t2[i]);
        }
        System.out.println(temp + t);
        return temp.equals(t);

    }
}